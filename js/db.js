import { db, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from './firebase-config.js';

let activeUnsubscribes = [];

const listenToData = (userId, collectionName, callback, extraConditions = []) => {
    const q = query(
        collection(db, collectionName), 
        where("userId", "==", userId),
        ...extraConditions
    );
    
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        callback(data, {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
        });
    }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        window.app?.setSyncStatus?.('error');
    });

    activeUnsubscribes.push(unsubscribe);
};

const listenToSharedData = (userEmail, collectionName, callback) => {
    const normalizedEmail = (userEmail || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    const q = query(
        collection(db, collectionName),
        where('sharedWith', 'array-contains', normalizedEmail)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data(), sharedCollection: collectionName }));
        callback(data, {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
        });
    }, (error) => {
        console.error(`Error fetching shared ${collectionName}:`, error);
        window.app?.setSyncStatus?.('error');
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

const upsertUser = async (userId, data) => {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
};

const updateRecord = async (collectionName, docId, data) => {
    await updateDoc(doc(db, collectionName, docId), data);
};

const deleteRecord = async (collectionName, docId) => {
    await deleteDoc(doc(db, collectionName, docId));
};

const addNotification = async (userId, title, message, extraData = {}) => {
    await addRecord("notifications", {
        userId,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        ...extraData
    });
};

const clearNotifications = async (userId) => {
    if (!userId) return;

    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, 'notifications', item.id))));
    window.app.showToast('Notifications cleared');
};

const markAllNotificationsRead = async (userId) => {
    if (!userId) return;

    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(q);
    const readAt = new Date().toISOString();
    await Promise.all(snapshot.docs.map((item) => updateDoc(doc(db, 'notifications', item.id), { read: true, readAt })));
    window.app.showToast('Notifications marked as read');
};

window.db = { listenToData, listenToSharedData, addRecord, upsertUser, updateRecord, deleteRecord, addNotification, clearNotifications, markAllNotificationsRead };

export { listenToData, listenToSharedData, addRecord, upsertUser, updateRecord, deleteRecord, addNotification, clearNotifications, markAllNotificationsRead };
