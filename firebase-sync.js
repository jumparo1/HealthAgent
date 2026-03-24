/* ═══════════════════════════════════════════════════════════════
   Firebase Sync — Firestore write-through + Google Sign-in
   Данните се пазят в localStorage (offline-first) и се синхронизират с Firestore.
   ═══════════════════════════════════════════════════════════════ */

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyAIXLmLTWfJWAADNNJwdJjQ4asedZCZFd4",
  authDomain: "health-agent-fd471.firebaseapp.com",
  projectId: "health-agent-fd471",
  storageBucket: "health-agent-fd471.firebasestorage.app",
  messagingSenderId: "133821496146",
  appId: "1:133821496146:web:d204b3ff84d983c163588b"
};

// Collections to sync (NOT synced: apikey, seeded_v3, docs)
var SYNC_COLLECTIONS = ['logs','findings','meds','foods','tests','treatment','profile','shoplist'];

var _fbApp = null;
var _fbAuth = null;
var _fbDb = null;
var _fbUid = null;
var _fbListeners = [];
var _fbDebounce = {};
var _fbSyncReady = false;

/* ── Init Firebase ── */
function fbInit() {
  try {
    _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    _fbAuth = firebase.auth();
    _fbDb = firebase.firestore();

    // Enable offline persistence
    _fbDb.enablePersistence({synchronizeTabs: true}).catch(function(err) {
      console.log('Firestore persistence:', err.code);
    });

    // Listen for auth state
    _fbAuth.onAuthStateChanged(function(user) {
      if (user) {
        _fbUid = user.uid;
        _fbSyncReady = true;
        fbStartListeners();
        fbPushAll(); // Initial push of local data
        fbUpdateUI(user);
      } else {
        // Sign in anonymously by default
        _fbAuth.signInAnonymously().catch(function(e) {
          console.error('Anonymous auth failed:', e);
        });
      }
    });
  } catch(e) {
    console.error('Firebase init failed:', e);
  }
}

/* ── Auth UI ── */
function fbUpdateUI(user) {
  var el = document.getElementById('sync-status');
  if (!el) return;
  if (user.isAnonymous) {
    el.innerHTML = '<span style="color:var(--yellow)" title="Анонимен — влез с Google за синхронизация между устройства">⚡ Анонимен</span> <button class="btn btn-sm" onclick="fbGoogleSignIn()" style="margin-left:6px">🔗 Вход с Google</button>';
  } else {
    el.innerHTML = '<span style="color:var(--green)" title="Синхронизирано с ' + user.email + '">✅ ' + (user.displayName || user.email) + '</span> <button class="btn btn-sm btn-del" onclick="fbSignOut()" style="margin-left:6px">Изход</button>';
  }
}

function fbGoogleSignIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  // If currently anonymous, link the account so data is preserved
  if (_fbAuth.currentUser && _fbAuth.currentUser.isAnonymous) {
    _fbAuth.currentUser.linkWithPopup(provider).then(function(result) {
      fbUpdateUI(result.user);
    }).catch(function(err) {
      if (err.code === 'auth/credential-already-in-use') {
        // Google account already exists — sign in directly (data merges on next push)
        _fbAuth.signInWithPopup(provider).then(function(result) {
          // Pull remote data to overwrite local
          fbPullAll();
        });
      } else {
        console.error('Link failed:', err);
        // Fallback: just sign in
        _fbAuth.signInWithPopup(provider).catch(function(e) { console.error(e); });
      }
    });
  } else {
    _fbAuth.signInWithPopup(provider).catch(function(e) { console.error(e); });
  }
}

function fbSignOut() {
  if (!confirm('Излез от Google? Данните остават локално.')) return;
  _fbStopListeners();
  _fbAuth.signOut();
}

/* ── Firestore write-through ── */
function fbPush(collection) {
  if (!_fbSyncReady || !_fbUid) return;

  // Debounce writes per collection (500ms)
  if (_fbDebounce[collection]) clearTimeout(_fbDebounce[collection]);
  _fbDebounce[collection] = setTimeout(function() {
    var isObj = (collection === 'treatment' || collection === 'profile');
    var data = isObj
      ? JSON.parse(localStorage.getItem('ha_' + collection) || '{}')
      : db(collection);

    _fbDb.collection('users').doc(_fbUid).collection('data').doc(collection).set({
      items: data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e) { console.error('Firestore push ' + collection + ':', e); });
  }, 500);
}

function fbPushAll() {
  SYNC_COLLECTIONS.forEach(function(col) { fbPush(col); });
}

function fbPullAll() {
  if (!_fbSyncReady || !_fbUid) return;
  SYNC_COLLECTIONS.forEach(function(col) {
    _fbDb.collection('users').doc(_fbUid).collection('data').doc(col).get().then(function(doc) {
      if (doc.exists && doc.data().items !== undefined) {
        var isObj = (col === 'treatment' || col === 'profile');
        if (isObj) {
          localStorage.setItem('ha_' + col, JSON.stringify(doc.data().items));
        } else {
          dbSave(col, doc.data().items);
        }
      }
    });
  });
  // Re-render current tab
  setTimeout(function() {
    var r = {log:renderLog,food:renderFood,health:renderHealth,docs:renderDocs,shop:renderShop,chat:renderChat,history:renderHistory};
    if (r[currentTab]) r[currentTab]();
  }, 1000);
}

/* ── Firestore listeners (real-time sync) ── */
function fbStartListeners() {
  _fbStopListeners();
  SYNC_COLLECTIONS.forEach(function(col) {
    var unsub = _fbDb.collection('users').doc(_fbUid).collection('data').doc(col)
      .onSnapshot(function(doc) {
        if (!doc.exists || !doc.metadata.hasPendingWrites) {
          // Only process server changes, not our own writes
          if (doc.exists && doc.data().items !== undefined && !doc.metadata.hasPendingWrites) {
            var isObj = (col === 'treatment' || col === 'profile');
            if (isObj) {
              localStorage.setItem('ha_' + col, JSON.stringify(doc.data().items));
            } else {
              // Write directly to localStorage without triggering another sync
              localStorage.setItem('ha_' + col, JSON.stringify(doc.data().items));
            }
            // Re-render if viewing this tab
            var tabMap = {logs:'log',foods:'food',findings:'health',meds:'health',tests:'health',treatment:'health',profile:'health',shoplist:'shop'};
            var tab = tabMap[col];
            if (tab && tab === currentTab) {
              var r = {log:renderLog,food:renderFood,health:renderHealth,shop:renderShop};
              if (r[tab]) r[tab]();
            }
          }
        }
      });
    _fbListeners.push(unsub);
  });
}

function _fbStopListeners() {
  _fbListeners.forEach(function(unsub) { unsub(); });
  _fbListeners = [];
}

/* ── Override dbSave to push to Firestore ── */
var _origDbSave = window.dbSave;
window.dbSave = function(k, v) {
  _origDbSave(k, v);
  if (SYNC_COLLECTIONS.indexOf(k) >= 0) {
    fbPush(k);
  }
};

// Also intercept direct localStorage writes for treatment/profile
var _origSetItem = localStorage.setItem.bind(localStorage);
var _lsOverridden = false;
if (!_lsOverridden) {
  _lsOverridden = true;
  localStorage.setItem = function(key, value) {
    _origSetItem(key, value);
    if (key === 'ha_treatment' || key === 'ha_profile') {
      var col = key.replace('ha_', '');
      if (SYNC_COLLECTIONS.indexOf(col) >= 0) {
        fbPush(col);
      }
    }
  };
}

/* ── Start ── */
fbInit();
