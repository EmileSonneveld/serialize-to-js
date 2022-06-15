let request = indexedDB.open("dbStj", 3);

const customerData = [
    {id: "444-44-4444", value: "Bill"},
    {id: "555-55-5555", value: "Donna"}
];


request.onerror = event => {
    // Handle errors.
};
let db = null;

request.onupgradeneeded = event => {
    db = event.target.result;
    console.log("onupgradeneeded")

    // Create an objectStore to hold information about our customers. We're
    // going to use "ssn" as our key path because it's guaranteed to be
    // unique - or at least that's what I was told during the kickoff meeting.
    let objectStore = db.createObjectStore("objectStoreStj", {keyPath: "id", autoIncrement: false});
    objectStore.createIndex("id", "id", {unique: true});
    // objectStore.createIndex("value", "value", {unique: false});

    // Use transaction oncomplete to make sure the objectStore creation is
    // finished before adding data into it.
    objectStore.transaction.oncomplete = event => {
        // Store values in the newly created objectStore.
        let customerObjectStore = db.transaction("objectStoreStj", "readwrite")
            .objectStore("objectStoreStj");
        customerData.forEach(function (customer) {
            customerObjectStore.add(customer);
        });
    };
};

request.onsuccess = event => {
    db = event.target.result;
    console.log("onsuccess")
};