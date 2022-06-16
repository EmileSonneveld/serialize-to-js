/**
 * Wrapper around indexedDB. (It has a pretty usly API)
 * If you use <5Mb of data, I reccomend localStorage. It has a nice sync API.
 */
function IndexedDbStorageConstructor(dbName) {
    let db = null;

    async function getIdValueobjectStore() {
        return new Promise((resolve, reject) => {
            if (db) {
                const customerObjectStore = db.transaction("idValueobjectStore", "readwrite")
                    .objectStore("idValueobjectStore");
                resolve(customerObjectStore)
            }

            const request = indexedDB.open(dbName, 1);

            request.onupgradeneeded = event => {
                db = event.target.result;

                const objectStore = db.createObjectStore("idValueobjectStore", {keyPath: "id", autoIncrement: false});
                objectStore.createIndex("id", "id", {unique: true});
                // objectStore.createIndex("value", "value", {unique: false}); // could be performance burden? Not tested

                // objectStore.transaction.oncomplete = event => {
                //     // 'request.onsuccess' gets called after this, so no need to wait
                // };
            };

            request.onsuccess = event => {
                try {
                    db = event.target.result;
                    const customerObjectStore = db.transaction("idValueobjectStore", "readwrite")
                        .objectStore("idValueobjectStore");
                    resolve(customerObjectStore)
                } catch (e) {
                    // Example of possible errors:
                    // NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
                    reject(e)
                }
            };

            // Example of possible errors:
            // "AbortError: Version change transaction was aborted in upgradeneeded event handler."
            // "VersionError: The requested version (1) is less than the existing version (2)."
            request.onerror = (e) => reject(e.target.error)
        });
    }

    async function setItem(id, value) {
        return new Promise((resolve, reject) => {
            // Can't make executor async, because async errors don't trigger 'reject' in promise.
            getIdValueobjectStore().then(store => {
                const request = store.put({id, value})
                request.onsuccess = () => {
                    resolve(request.result ? request.result.value : null)
                };
                request.onerror = reject
            }).catch(reject);
        })
    }

    function getItem(id) {
        return new Promise((resolve, reject) => {
            // Can't make executor async, because async errors don't trigger 'reject' in promise.
            getIdValueobjectStore().then(store => {
                const request = store.get(id)
                request.onsuccess = () => {
                    resolve(request.result ? request.result.value : null)
                };
                request.onerror = reject
            }).catch(reject);
        })
    }

    return {getIdValueobjectStore, setItem, getItem}
}

indexedDbStorage = IndexedDbStorageConstructor("dbStj")
