import React from 'react';
import * as FBConnection from './firebaseconnect';
import * as Auth from './authentication';
import {timeArray, GetDateString} from './common';
import '../css/agenda.css';

// Material-UI theme and component libraries.
import {GridList, GridTile} from 'material-ui/GridList';
import Checkbox from 'material-ui/Checkbox';
import IconButton from 'material-ui/IconButton';
import ContentClear from 'material-ui/svg-icons/content/clear'

const fbDB = FBConnection.fbApp.database();

export class DailyAgendaView extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			meetingArray: [],
		};
	}
	
	componentWillMount = () => {
		let date = new Date(this.props.date.getFullYear(), this.props.date.getMonth(), 
							this.props.date.getDate(), 0, 0, 0, 0);
		
		this.GetMeetingArray(GetDateString(date));
	}
	
	componentWillReceiveProps = (nextProps) => {
		// update our meetingArray whenever the date prop changes.
		let date = this.props.date;
		if (GetDateString(nextProps.date) !== GetDateString(this.props.date)) {
			date = nextProps.date;
			
			this.GetMeetingArray(GetDateString(date));
		}
	}
	
	handleMeetingDelete = (mid, date, timeKey) => {
		let updates = {};
		updates['/users/' + Auth.fbAuth.currentUser.uid + '/meetings/'
							+ mid] = null;
		updates['/meetings/' + date + '/' + timeKey] = null;

		fbDB.ref().update(updates);
		
		let i;
		let tmpArray = this.state.meetingArray.slice();
		for (i = 0; i < tmpArray.length; i++) {
			if (tmpArray[i].id === mid) {
				break;
			}
		}
		
		// removes the deleted meeting from our meetingArray.
		tmpArray.splice(i, 1); 
		this.setState({ meetingArray: tmpArray });
	}
	
	handleAttendToggle = (isChecked, mid) => {
		// toggle whether this user is attending this meeting.
		let updates = {};
		updates['/users/' + Auth.fbAuth.currentUser.uid + '/meetings/' 
							+ mid + '/accepted'] = isChecked;
		fbDB.ref().update(updates);
		
		// update the meetingArray.
		let tmpArray = this.state.meetingArray.slice();
		for (let i = 0; i < tmpArray.length; i++) {
			if (tmpArray[i].id === mid) {
				tmpArray[i].accepted = isChecked;
				break; // don't bother going any further in the array.
			}
		}

		this.setState({ meetingArray: tmpArray });
	}
	
	GetMeetingArray = (date) => {
		fbDB.ref('/meetings/' + date).once('value').then((snapshot) => {
			let arraySize = snapshot.numChildren();
			let meetingArray = [];
			if (arraySize === 0) {
				this.setState({ meetingArray: meetingArray });
			}
			
			fbDB.ref('/users/').once('value').then((users) => {
				let currentUser = users.child(Auth.fbAuth.currentUser.uid);
				snapshot.forEach((childSnapshot) => {
					// get the timeKey for the current entry.
					let tk = childSnapshot.key;
					// get the length;
					let len = childSnapshot.child('length').val();
					// get the creator
					let creator = childSnapshot.child('creator').val();
					let uid = users.child(creator).key;
					let user = users.child(creator).val();
					let fn = user.firstname;
					let ln = user.lastname;
					creator = fn + ' ' + ln;
						
					// build a date value for this item.
					let thisDate = new Date(Date.parse(date));
					thisDate.setMilliseconds(tk);

					// get a time in the format we need.
					let ampm = 'AM';
					let hour = thisDate.getHours();
					if (hour >= 12) {
						ampm = 'PM';
						if (hour > 12) {
							hour -= 12;
						}
					}
					let minute = thisDate.getMinutes();
		
					let minstring = minute;
					if (minute === 0) {
						minstring = '00';
					}
					let time = hour + ':' + minstring + ampm;
					
					// get the meeting name
					let name = childSnapshot.child('name').val();

					// get the meeting id
					let mid = childSnapshot.child('mid').val();
					
					// get this user's acceptance
					let usersMeetings = currentUser.child('meetings');
					let thisMeeting = usersMeetings.child(mid).val();
					let accepted;
					let invited;
					if (thisMeeting) {
						accepted = thisMeeting.accepted;
						invited = true;
					} else {
						invited = false;
						accepted = false;
					}
					
					let owned = (uid === Auth.fbAuth.currentUser.uid);
					
					// push to the array of meetings.
					meetingArray.push({ time: time , timeKey: tk, length: len, 			
								creator: fn + ' ' + ln, name: name, id: mid, date: date,
								accepted: accepted, owned: owned, invited: invited
					});
				});
				
				this.setState({ meetingArray: meetingArray });
			});
		});
	}
	
	BuildGrid = () => {
		let tileArray = [];

		let iMeet = 0; //index into meetingArray
		let skip = 0;
		for (let i = 0; i < 25; i++) {
			let row = 1;
			
			if (skip === 0) {
				// if the current time slot matches our next meeting,
				if (iMeet < this.state.meetingArray.length) {
					let meeting = this.state.meetingArray[iMeet];
					if (timeArray[i] === meeting.time) {
						// we need to increase the row size, 1 row per 30 minutes.
						row = meeting.length / 30;

						// push a meeting entry.
						tileArray.push(
							<GridTile rows={row}>
								<GridViewMeeting 
									time={timeArray[i]} 
									title={meeting.name}
									creator={meeting.creator}
									id={meeting.id}
									date={meeting.date}
									timeKey={meeting.timeKey}
									attending={meeting.accepted}
									invited={meeting.invited}
									owned={meeting.owned}
									onDelete={this.handleMeetingDelete}
									onAttendToggle={this.handleAttendToggle}
								/>
							</GridTile>
						);
						
						skip = row - 1;
						iMeet++;
					} else {
						// we'll push a blank tile if we don't have a meeting in this slot.
						tileArray.push(
							<GridTile rows={row}>
								<GridViewBlank time={timeArray[i]} />
							</GridTile>
						);
					}
				} else {
					// if we have no meetings, we just want to fill up the schedule
					// with blanks.
					tileArray.push(
						<GridTile rows={row}>
							<GridViewBlank time={timeArray[i]} />
						</GridTile>
					);
				}
			} else {
				// we're skipping if we had a meeting longer than 30 minutes.
				// as that meeting will have filled this timeslot/row.
				skip--;
			}
		}

		return tileArray;
	}
		
	render() {
		return (
			<GridList cols={1} cellHeight={40} padding={1}>
				{this.BuildGrid()}
			</GridList>
		);
	}
}

class GridViewMeeting extends React.Component {
	handleAttendToggle = (e, isChecked) => {
		this.props.onAttendToggle(isChecked, this.props.id);
	}
	
	handleDeleteMeeting = (e) => {
		this.props.onDelete(this.props.id, this.props.date, this.props.timeKey);
	}

	render() {
		const style = {
			icon: {
				height: 29,
				width: 29,
				paddingTop: 5,
				right: 10,
				float: 'right',
			},
			
			tile: {
				backgroundColor: '#80deea',
			},
			
			box: {
				backgroundColor: '#80deea',
				fill: 'black',
			}
		}
		
		return (
			<GridList className='grid-view-meeting-paper' style={style.tile} cols={5}>
				<GridTile>
					{this.props.time}
				</GridTile>
				<GridTile>
					Title: {this.props.title}
				</GridTile>
				<GridTile>
					Owner: {this.props.creator}
				</GridTile>
				<GridTile>
					<Checkbox label='Attending'
						checked={this.props.attending}
						labelPosition='left'
						onCheck={this.handleAttendToggle}
						disabled={!this.props.invited}
						iconStyle={style.box}
					/>
				</GridTile>
				<GridTile>
					<IconButton	
						style={style.icon} 
						disabled={!this.props.owned} 
						onTouchTap={this.handleDeleteMeeting}
					>
						<ContentClear hoverColor='red' />
					</IconButton>
				</GridTile>
			</GridList>
		);
	}
}

class GridViewBlank extends React.Component {
	render() {
		const style = {
			backgroundColor: '#F5F5F5',
		};
		
		// we're using the same size grid for the blank as we do for a meeting
		// so that the times are lined up.
		return (
			<GridList className='grid-view-meeting-paper-blank' style={style} cols={5}>
				<GridTile>
					{this.props.time}
				</GridTile>
			</GridList>
		);
	}
}