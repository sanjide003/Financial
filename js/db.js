import { db, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from './firebase-config.js';

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

const updateRecord = async (collectionName, docId, data) => {
    await updateDoc(doc(db, collectionName, docId), data);
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

const clearNotifications = async (userId) => {
    if (!userId) return;

    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, 'notifications', item.id))));
    window.app.showToast('Notifications cleared');
};

window.db = { listenToData, addRecord, updateRecord, deleteRecord, addNotification, clearNotifications };

export { listenToData, addRecord, updateRecord, deleteRecord, addNotification, clearNotifications };
