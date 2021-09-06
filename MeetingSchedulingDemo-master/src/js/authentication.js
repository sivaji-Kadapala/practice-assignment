import React from 'react';
import * as FBConnection from './firebaseconnect';
import '../css/authentication.css';
import graph from 'fb-react-sdk'; // facebook

// Material-UI theme and component libraries.
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';

export const fbAuth = FBConnection.fbApp.auth();

// Button to Log the Firebase user out.
export class LogOut extends React.Component {
	handleSignOut = () => {
		fbAuth.signOut()
			.then(e => {
				// sign out successful
			})
			.catch(e => {
				// sign out failed. Error thrown.
			});
	}
	
	render() {
		return (
			<RaisedButton className="signInButton"
				label="Sign Out"
				onTouchTap={this.handleSignOut}
				disabled={this.props.disabled}
			/>
		);
	}
}

// Controller for SignIn and SignUp views.
export class LogIn extends React.Component {
	constructor() {
		super();
		
		this.state = {
			signup: false,
		};
	}
	
	handleSignUpClicked = () => {
		this.setState({ signup: true });
	}
	
	handleSignUp = (fn, ln, email) => {
		this.setState({signup: false});
	}
	
	render() {
		let view;
		if (!this.state.signup) {
			view = (<SignIn onSignUpClicked={this.handleSignUpClicked} />);
		} else {
			view = (<SignUp onSignUp={this.handleSignUp} />);
		}
		
		return (
			<div>{view}</div>
		);
	}
}

class SignIn extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			email: null,
			pw: null,
			signinerror: "",
		};
	}

	handleDialogClose = () => {
		this.setState({signinerror: ""});
	}
	
	onEmail = (e) => {
		this.setState({ email: e });
	}
	
	onPassword = (p) => {
		this.setState({ pw: p });
	}
	
	handleSignIn = (result) => {
		// we need to check whether this was an alternative provider login.
		// if so, there will be a credential provided containing an API code and providerId.
		if (result.credential) {
			let fbDB = FBConnection.fbApp.database();
			
			switch (result.credential.providerId) {
				case 'facebook.com': 
					let uid = result.user.uid;
					
					fbDB.ref('users/' + uid).once('value').then(snapshot => {
						// check whether the uid is in the database.
						// if it isn't, we need to add the user.
						if (!snapshot.exists()) {
							// user does not contain firstname and lastname.
							// we need to retrieve that from facebook.
							graph.setAccessToken(result.credential.accessToken);
							let params = { fields: 'first_name, last_name' };
							graph.get("me", params, function(err, res) {
								if (res) {
									fbDB.ref('users/' + uid).set({
										firstname: res.first_name,
										lastname: res.last_name,
										email: result.user.email,
									});
								} else {
									// we had some problem getting the data from facebook.
									// just use the displayName as firstname and leave lastname blank.
									fbDB.ref('users/' + uid).set({
										firstname: result.user.displayName,
										lastname: "",
										email: result.user.email,
									});
								}
							});
						}
					});
					break;
				default: break;
			}
		} 
	}
	
	handleSignInError = (error) => {
		this.setState({ signinerror: error.message });
	}

	render() {
		return (
			<Paper className="signInPaper" zDepth={2}>
				<h3>Sign In</h3>
				<EmailField onUpdate={this.onEmail} />
				<br />
				<PasswordField onUpdate={this.onPassword} />
				<br />
				<FirebaseEmailPasswordSignIn
					onSignIn={this.handleSignIn}
					onError={this.handleSignInError}
					email={this.state.email}
					pw={this.state.pw}
				/>
				<FirebaseFacebookSignInPopUp
					onSignIn={this.handleSignIn}
					onError={this.handleSignInError}
				/>				
				<br />
				<RaisedButton className="signInButton"
					label="Sign Up"
					onTouchTap={this.props.onSignUpClicked}
				/>
				<Dialog
					title="Error Signing In"
					modal={false}
					open={this.state.signinerror !== ""}
					onRequestClose={this.handleDialogClose}
				>
					{this.state.signinerror}
				</Dialog>
			</Paper>
		);
	}
}

class SignUp extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			email: null,
			pw: null,
			signinerror: "",
			firstname: null,
			lastname: null,
		};
	}
	
	onEmail = (e) => {
		this.setState({ email: e });
	}
	
	onPassword = (p) => {
		this.setState({ pw: p });
	}
	
	onFirstName = (n) => {
		this.setState({ firstname: n });
	}
	
	onLastName = (n) => {
		this.setState({ lastname: n });
	}
		
	handleSignUp = (result) => {
		let fbDB = FBConnection.fbApp.database();
		
		// add the new user to the database.
		fbDB.ref('users/' + result.uid).set({
			firstname: this.state.firstname,
			lastname: this.state.lastname,
			email: this.state.email,
		});
	}
	
	handleSignUpError = (error) => {
		let msg = error.message;
		if (error.code === 'auth/email-already-in-use') {
			fbAuth.fetchProvidersForEmail(this.state.email).then(providers => {
				msg += ' ';
				msg += 'Please try one of these providers: ';
				providers.forEach(entry => {
					msg += entry + ' ';
				});
				this.setState({ signinerror: msg });
			});
		}
		
		this.setState({ signinerror: msg });
	}
	
	handleDialogClose = () => {
		this.setState({ signinerror: "" });
	}
	
	handleCancel = () => {
		this.props.onSignUp(null, null, null);
	}
	
	render() {
		return (
			<Paper className="registerPaper" zDepth={4}>
				<h3>Register</h3>
				<NameField onUpdate={this.onFirstName} label="First Name" />
				<br />
				<NameField onUpdate={this.onLastName} label="Last Name" />
				<br />
				<EmailField onUpdate={this.onEmail} />
				<br />
				<PasswordField onUpdate={this.onPassword} />
				<br />
				<FirebaseEmailPasswordSignUp
					onSignUp={this.handleSignUp}
					onError={this.handleSignUpError}
					email={this.state.email}
					pw={this.state.pw}
				/>
				<RaisedButton className="signInButton"
					label="Cancel"
					onTouchTap={this.handleCancel}
				/>
				<Dialog
					title="Error Signing Up"
					modal={false}
					open={this.state.signinerror !== ""}
					onRequestClose={this.handleDialogClose}
				>
					{this.state.signinerror}
				</Dialog>
			</Paper>
		);
	}
}

class FirebaseEmailPasswordSignUp extends React.Component {
	handleSignUp = () => {
		if (checkEmail(this.props.email) || checkPassword(this.props.pw)) {
			return;
		}
		
		fbAuth.createUserWithEmailAndPassword(this.props.email, this.props.pw)
			.then(result => {
				this.props.onSignUp(result);
			})
			.catch(error => {
				this.props.onError(error);
			});
	}
	
	render() {
		return (
			<RaisedButton className="signInButton" 
				label="Sign Up" 
				onTouchTap={this.handleSignUp} 
			/>
		);
	}
}

class FirebaseEmailPasswordSignIn extends React.Component {
	handleSignIn = () => {
		if (checkEmail(this.props.email) || checkPassword(this.props.pw)) {
			return;
		}
		
		fbAuth.signInWithEmailAndPassword(this.props.email, this.props.pw)
			.then(result => {
				this.props.onSignIn(result);
			})
			.catch(error => {
				this.props.onError(error);
			});
	}
	
	render() {
		return (
			<RaisedButton className="signInButton" 
				label="Sign In" 
				onTouchTap={this.handleSignIn} 
			/>
		);
	}
}

class FirebaseFacebookSignInPopUp extends React.Component {
	handleFBSignIn = () => {
		let provider = new FBConnection.auth.FacebookAuthProvider();
		
		fbAuth.signInWithPopup(provider)
			.then(result => {
				this.props.onSignIn(result);
			}).catch(error => {
				this.props.onError(error);
			});
	}
	
	render() {
		return (
			<RaisedButton className="signInButton"
				label="Sign In with Facebook"
				onTouchTap={this.handleFBSignIn}
			/>
		);
	}
}

class EmailField extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			error: null,
		};
	}
	
	getEmail = (e) => {
		this.setState({ error: checkEmail(e.target.value) });
		this.props.onUpdate(e.target.value);
	}
	
	render() {
		return (
			<TextField className="signInTextField"
				hintText="username@example.com"
				floatingLabelText="email address"
				errorText={this.state.error}
				onChange={this.getEmail}
			/>
		);
	}
}

class PasswordField extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			error: null,
		};
	}
	
	getPassword = (e) => {
		this.setState({ error: checkPassword(e.target.value) });
		this.props.onUpdate(e.target.value);
	};
	
	render() {
		return (
			<TextField className="signInTextField"
				type="password" floatingLabelText="password"
				errorText={this.state.error}
				onChange={this.getPassword} 
			/>
		);
	}
}

class NameField extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			error: null,
		};
	}
	
	getValue = (e) => {
		this.setState({ error: checkName(e.target.value)? null : "Please enter a name." });
		this.props.onUpdate(e.target.value);
	}
	
	render() {
		return (
			<TextField className="signInTextField"
				floatingLabelText={this.props.label}
				errorText={this.state.error}
				onChange={this.getValue}
			/>
		);
	}

}

function checkName(name) {
	return name.length > 0;
}

function checkEmail(email) {
	let rule = ".+@.+\\..+"; // matches email address to anything of the form a@b.c
	let regex = new RegExp(rule);
	
	if (!regex.test(email)) {
		return "Email must be of the form username@example.com";
	} 
		
	return null;
}

function checkPassword(pw) {
	if (!pw) {
		return "Please enter a password.";
	}
		
	if (pw.length < 8) {
		return "Password should be a minimum of 8 characters";
	}
		
	// digits or special characters !@#$%^&*()-_+=,.<>;':"[]{}\|
	let rule = "[0-9]|!|@|#|\\$|%|\\^|&|\\*|\\(|\\)|-|_|\\+|=|,|\\.|<|>|/|\\?|;|:|'|\"|{|}|\\[|\\]|\\\\|\\|"; 
	//let rule = "[0-9]|!"; 
	let regex = new RegExp(rule);
		
	if (pw.search(regex) === -1) {
		return "Password should contain numbers or special characters.";
	}
		
	// upper-case and lower-case letters.
	rule = "[a-z]|[A-Z]";
	regex = new RegExp(rule);
		
	if (pw.search(regex) === -1) {
		return "Password should contain letters.";
	}
		
	// white space
	rule = "\\s";
	regex = new RegExp(rule);
		
	if (pw.search(regex) !== -1) {
		return "Password should not contain white space."
	}
		
	return null;
}
