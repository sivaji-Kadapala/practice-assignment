import React from 'react';
import '../css/App.css';
import * as Auth from './authentication';
import * as Agenda from './agenda.js';
import {Home} from './home';

// Material-UI theme and component libraries.
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import AppBar from 'material-ui/AppBar';

// needed for Material-UI
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

class Main extends React.Component {
	constructor() {
		super();
		
		this.state = {
			loggedin: Auth.fbAuth.currentUser? true : false,
		}
		
		Auth.fbAuth.onAuthStateChanged(user => {
			if (user) {
				this.setState({loggedin: true});
			} else {
				this.setState({loggedin: false});
			}
		});
	}
	
	render() {
		return (
			<div>
				<AppBar
					title="Meeting Project"
					showMenuIconButton={false}
					iconElementRight={<Auth.LogOut disabled={!this.state.loggedin} />}
				/>
				{this.state.loggedin? <Agenda.Agenda /> : <Home />}
			</div>
		);
	}
}

class App extends React.Component {

	
	render() {
		return (
			<MuiThemeProvider>
				<Main />
			</MuiThemeProvider>
		);
	}
}

export default App;
