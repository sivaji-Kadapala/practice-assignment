import * as firebase from 'firebase';
export * from 'firebase';

// Initialize Firebase
const config = {
	apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
};

export const fbApp = firebase.initializeApp(config);
