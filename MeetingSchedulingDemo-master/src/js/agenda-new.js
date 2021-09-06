import React from 'react';
import * as FBConnection from './firebaseconnect';
import * as Auth from './authentication';
import {timeArray, GetDateString} from './common';
import '../css/agenda.css';

import RaisedButton from 'material-ui/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Chip from 'material-ui/Chip';
import ChipInput from 'material-ui-chip-input'

const fbDB = FBConnection.fbApp.database();

export class NewMeetingView extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			meetingLength: 60,
			time: null,
			meetingName: '',
			userList: [],
			invitees: [],
		}
	}
	
	componentDidMount = () => {
		// grab a list of all users for the invitee list.
		fbDB.ref('/users/').once('value').then((users) => {
			// save the uid an name of the users.
			let userList = [];
			
			users.forEach((user) => {
				let uid = user.key;
				
				// we don't want to add the current user to the
				// list since this list is for who to invite.
				// the meeting creator can't invite themself.
				if (uid !== Auth.fbAuth.currentUser.uid) {
					let userData = user.val();
					let fn = userData.firstname;
					let ln = userData.lastname;
					let userName = fn + ' ' + ln;
					userList.push({ uid: uid, name: userName });
				}
			});
			
			this.setState({ userList: userList });
		});
	}
	
	getMeetingName = (e) => {
		this.setState({ meetingName: e.target.value });
	}
	
	handleMeetingLength = (val) => {
		this.setState({ meetingLength: val });
	}
	
	handleTimeChange = (time) => {
		this.setState({time: time});
	}
	
	handleAdd = () => {
		if (!this.state.time) {
			return;
		}
		// firebase does not have Date or Time objects.
		// we need to store the date and time in an accessible format.
		// we're going to store them as 2 separate strings so that we
		// can store multiple times under each date in the database.
		
		// date format will be YYYY-MM-DD
		let newDate = GetDateString(this.props.date);

		// time will be stored as the number of milliseconds from newDate 
		// to the start of the meeting.
		let newTime = new Date(this.props.date.getUTCFullYear(), 
								this.props.date.getUTCMonth(), 
								this.props.date.getUTCDate(), 
								this.state.time.getHours(), 
								this.state.time.getMinutes(), 
								0, 
								0);
		let tempDate = this.props.date;
		let timeKey = newTime - tempDate;

		// now we need to confirm that this meeting won't overlap
		// with any existing meetings.
		// If it is valid, then we'll update the database.
		this.ValidateMeeting(newDate, timeKey, this.state.meetingLength);
	}
	
	ValidateMeeting = (date, timeKey, length) => {
		// create a startDate and an endDateComp
		let baseDate = new Date(Date.parse(date));
		let startDate = new Date(baseDate);
		startDate.setMilliseconds(timeKey);
		let endDate = new Date(startDate);
		endDate.setMinutes(endDate.getMinutes() + length);

		let isOK = true; // variable marks whether meeting is valid.

		// query database for any meetings on the same day.
		let meetingQuery = fbDB.ref('/meetings/' + date).once('value');
		meetingQuery.then((snapshot) => {
			snapshot.forEach((childSnapshot) => {
				// get the timeKey for the current entry.
				let tk = childSnapshot.key;
				// get the length;
				let len = childSnapshot.child('length').val();
				// build start and end dates for the current
				// meeting we're comparing to.
				let startDateComp = new Date(baseDate);
				startDateComp.setMilliseconds(tk);
				let endDateComp = new Date(startDateComp);
				endDateComp.setMinutes(endDateComp.getMinutes() + len);

				// check whether the start and end dates overlap.
				if ((startDate >= startDateComp && startDate < endDateComp) ||
					(endDate > startDateComp && endDate <= endDateComp) ||
					(startDateComp >= startDate && startDateComp < endDate) ||
					(endDateComp > startDate && endDateComp <= endDate)) {
					isOK = false;
				} 
			});
			
			if (isOK) {
				this.UpdateDB(date, timeKey, length, this.state.meetingName);
				this.props.onAdd(true);
				this.Clear();
			} else {
				this.props.onAdd(false);
				this.props.onError('The specified timeslot overlaps with an existing meeting.');
			}
		});
	}
	
	UpdateDB(date, timeKey, length, name) {
		// get the current user.
		let user = Auth.fbAuth.currentUser;
		
		// add meeting to the database.
		// add the new date and time to the database with meeting length and creator.
		fbDB.ref('meetings/' + date + '/' + timeKey).set({
			length: length,
			creator: user.uid,
			name: name,
		});
		
		// create a unique meeting ID so we can see which meetings a user is attached to.
		let meetingKey = fbDB.ref('/users/' + user.uid + '/meetings').push().key;
		
		// push that meetingKey to both the meeting and the user's list of meetings.
		let updates = {};
		updates['/meetings/' + date + '/' + timeKey + '/mid'] = meetingKey;
		updates['/users/' + user.uid + '/meetings/' + meetingKey + '/accepted'] = true;
		
		// add an update for each invitee to add the meeting to their lists in an
		// unaccepted state.
		this.state.invitees.forEach((invitee) => {
			let i = this.state.userList.indexOf(invitee);
			let uid = this.state.userList[i].uid;
			
			updates['/users/' + uid + '/meetings/' + meetingKey + '/accepted'] = false;
		});
		
		fbDB.ref().update(updates);
	}
	
	Clear = () => {
		this.setState({ meetingLength: 60,
						time: null,
						meetingName: '',
						invitees: [] });
	}
	
	handleUpdateInvitees = (invitees) => {
		this.setState({ invitees: invitees });
	}
	
	render () {
		return (
			<div className='edit-meeting'>
				<TextField className="meetingNameField"
					floatingLabelText="Meeting Name"
					value={this.state.meetingName}
					onChange={this.getMeetingName}
				/>
				<br />
				<MeetingStartTimeMenu
					initialVal={this.state.time}
					onChange={this.handleTimeChange}
				/>
				<br />
				<MeetingLengthMenu 
					length={this.state.meetingLength} 
					onChange={this.handleMeetingLength} 
				/>
				<br />
				<InviteField 
					userList={this.state.userList} 
					onUpdateInvitees={this.handleUpdateInvitees}
					invitees={this.state.invitees}
				/>
				<br />
				<RaisedButton className='button' 
					label='Add Meeting'
					primary={true} 
					onTouchTap={this.handleAdd}					 
				/>
			</div>
		);
	}
}

class MeetingStartTimeMenu extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			value: null,
		}
	}
	handleChange = (event, index, value) => {
		this.setState({ value: value});
		
		// create a time value to pass back that matches our selected time.
		let h; // hour
		let m; // minute
		switch (value) {
			case 1:
				h = 8;
				m = 0;
				break;
			case 2:
				h = 8;
				m = 30;
				break;
			case 3:
				h = 9;
				m = 0;
				break;
			case 4:
				h = 9;
				m = 30;
				break;
			case 5:
				h = 10;
				m = 0;
				break;
			case 6:
				h = 10;
				m = 30;
				break;
			case 7:
				h = 11;
				m = 0;
				break;
			case 8:
				h = 11;
				m = 30;
				break;
			case 9:
				h = 12;
				m = 0;
				break;
			case 10:
				h = 12;
				m = 30;
				break;
			case 11:
				h = 13;
				m = 0;
				break;
			case 12:
				h = 13;
				m = 30;
				break;
			case 13:
				h = 14;
				m = 0;
				break;
			case 14:
				h = 14;
				m = 30;
				break;
			case 15:
				h = 15;
				m = 0;
				break;
			case 16:
				h = 15;
				m = 30;
				break;
			case 17:
				h = 16;
				m = 0;
				break;
			case 18:
				h = 16;
				m = 30;
				break;
			case 19:
				h = 17;
				m = 0;
				break;
			case 20:
				h = 17;
				m = 30;
				break;
			case 21:
				h = 18;
				m = 0;
				break;
			default:
				h = 0;
				m = 0;
		}
		
		let t = new Date(0, 0, 0, h, m, 0, 0);

		this.props.onChange(t);
	}
	
	BuildMenu = () => {
		let menuArray = [];
			
		for (let i = 0; i < 21; i++) {
			// push a menu item.
			menuArray.push(
				<MenuItem
					value={i + 1}
					primaryText={timeArray[i]}
				/>
			);
		}

		return menuArray;
	}
	
	render() {
		return (
			<SelectField floatingLabelText='Meeting Start Time'
				value={this.props.initialVal? this.state.value : this.props.initialVal}
				onChange={this.handleChange}
			>			
				{this.BuildMenu()}
			</SelectField>
		);
	}
}

class MeetingLengthMenu extends React.Component {
	handleChange = (event, index, value) => {
		this.props.onChange(value);
	}
	
	render () {
		return (
			<SelectField floatingLabelText='Meeting Length' 
				value={this.props.length} 
				onChange={this.handleChange} 
			>
				<MenuItem value={30} primaryText='30 minutes' />
				<MenuItem value={60} primaryText='1 hour' />
				<MenuItem value={90} primaryText='90 minutes' />
				<MenuItem value={120} primaryText='2 hours' />
			</SelectField>
		);
	}
}

// use the ChipInput component to build a list of invitees
// to the meeting. This component appears to disallow duplicates
// automatically.
let users = ['Chris Serson', 'Deckard Mallory', 'Mighty Quinn'];
class InviteField extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			error: '',
		};
	}
	
	handleRequestAdd = (user) => {
		let i = this.props.userList.indexOf(user);
		
		if (i >= 0) {
			let tmpList = this.props.invitees.slice();
			tmpList.push(user);
			
			if (this.state.error !== '') {
				this.setState({ error: '' });
			}
			
			this.props.onUpdateInvitees(tmpList);
		} else {
			this.setState({ error: 'Please enter a valid user' });
		}
	}
	
	handleRequestDelete = (user) => {
		let tmpList = this.props.invitees.slice();
		let i = tmpList.indexOf(user);
		tmpList.splice(i, 1);
		
		this.props.onUpdateInvitees(tmpList);
	}
	
	render() {
		return (
			<div className='invite-field'>
			<ChipInput
				dataSource={this.props.userList}
				dataSourceConfig={{text: 'name', value: 'uid'}}
				fullWidth={true}
				hintText='Enter Invitee Names'
				value={this.props.invitees}
				onRequestAdd={(user) => this.handleRequestAdd(user)}
				onRequestDelete={(user) => this.handleRequestDelete(user)}
				errorText={this.state.error}
			/>
			</div>
		);
	}
}