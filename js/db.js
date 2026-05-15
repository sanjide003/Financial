import { db, collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from './firebase-config.js';

let activeUnsubscribes = [];

const listenToData = (userId, collectionName, callback, extraConditions = []) => {
    const q = query(
        collection(db, collectionName), 
        where("userId", "==", userId),
        ...extraConditions
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        callback(data);
    }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
    });

    activeUnsubscribes.push(unsubscribe);
};

const addRecord = async (collectionName, data) => {
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

const deleteRecord = async (collectionName, docId) => {
    await deleteDoc(doc(db, collectionName, docId));
};

const addNotification = async (userId, title, message) => {
    await addRecord("notifications", {
        userId,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false
    });
};

const clearNotifications = async () => {
    // Note: Deleting multiple docs requires querying first. 
    // For simplicity in UI, we'll implement this later or use a batch delete.
    window.app.showToast("Clear feature coming soon");
}

window.db = { listenToData, addRecord, deleteRecord, addNotification, clearNotifications };

export { listenToData, addRecord, deleteRecord, addNotification };
