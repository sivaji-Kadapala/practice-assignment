import React from 'react';
import * as Auth from './authentication';

export class Home extends React.Component {
	render() {
		return (
			<Auth.LogIn />
		);
	}
}