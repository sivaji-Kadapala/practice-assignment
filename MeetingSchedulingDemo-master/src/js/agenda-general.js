import React from 'react';
import * as FBConnection from './firebaseconnect';
import * as Auth from './authentication';
import {GetDateString} from './common';
import '../css/agenda.css';

// Material-UI theme and component libraries.
import {List, ListItem} from 'material-ui/List';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';

const fbDB = FBConnection.fbApp.database();

export class GeneralAgendaView extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			meetingArrays: [],
		};
	}
	
	componentWillMount = () => {
		let startDate = GetDateString(this.props.date);

		this.UpdateArray(startDate);
	}
	
	componentWillReceiveProps = (nextProps) => {
		let date = GetDateString(nextProps.date);
		if (date !== GetDateString(this.props.date)) {
			this.UpdateArray(date);
		}
	}
	
	UpdateArray = (date) => {
		let meetingArrays = [];
		// grab all of the days and their meetings for this week.
		let meetingRef = fbDB.ref('/meetings/').orderByKey()
			.startAt(date);
		meetingRef.once('value').then((snapshot) => {
			// grab the users so we can get the creator name.
			fbDB.ref('/users/').once('value').then((users) => {
				let currentUser = users.child(Auth.fbAuth.currentUser.uid);
				snapshot.forEach((day) => {
					let thisDate = new Date(Date.parse(day.key));
					let meetingArray = [];
					day.forEach((meeting) => {
						// get the timeKey for the current entry.
						let tk = meeting.key;
						// get the length;
						let len = meeting.child('length').val();
						// get the creator
						let creator = meeting.child('creator').val();
						let uid = users.child(creator).key;
						let user = users.child(creator).val();
						let fn = user.firstname;
						let ln = user.lastname;
						creator = fn + ' ' + ln;
						
						// build a date value for this item.
						let tmpDate = new Date(thisDate);
						tmpDate.setMilliseconds(tk);
			
						// get a time in the format we need.
						let ampm = 'AM';
						let hour = tmpDate.getHours();
						if (hour >= 12) {
							ampm = 'PM';
							if (hour > 12) {
								hour -= 12;
							}
						}
						
						let minute = tmpDate.getMinutes();
						let minstring = minute;
						if (minute === 0) {
							minstring = '00';
						}
						let time = hour + ':' + minstring + ampm;
						
						// get the meeting name
						let name = meeting.child('name').val();

						// get the meeting id
						let mid = meeting.child('mid').val();
						
						// get this user's acceptance
						let usersMeetings = currentUser.child('meetings');
						let thisMeeting = usersMeetings.child(mid).val();
						let accepted;
						let invited;
						if (thisMeeting) {
							accepted = thisMeeting.accepted;
							invited = true;
						} else {
							accepted = false;
							invited = false;
						}
						
						let owned = (uid === Auth.fbAuth.currentUser.uid);
						
						// push to the array of meetings.
						meetingArray.push({ time: time , timeKey: tk, 
								length: len, creator: creator, 
								name: name, id: mid, date: thisDate,
								accepted: accepted, owned: owned, invited: invited,
						});
					});
							
					meetingArrays.push(meetingArray);
				});
				
				this.setState({ meetingArrays: meetingArrays });
			});
		});
	}
	
	render() {
		return (
			<AgendaTable meetings={this.state.meetingArrays} />
		);
	}
}

class AgendaTable extends React.Component {
	BuildTable = () => {
		let tableRows = [];
		
		this.props.meetings.forEach((day) => {
			tableRows.push(<TableRow><DayTable day={day} /></TableRow>);
		});
		
		return tableRows;
	}
	
	render() {
		return (
			<Table height={1050} selectable={false}>
				<TableBody displayRowCheckbox={false}>
					{this.BuildTable()}
				</TableBody>
			</Table>
		);
	}
}

class DayTable extends React.Component {
	BuildTable = () => {
		let tableRows = [];
		
		this.props.day.forEach((meeting) => {
			tableRows.push(
				<DayTableEntry
					time={meeting.time}
					title={meeting.name}
					creator={meeting.creator}
					length={meeting.length}
					invited={meeting.invited}
					accepted={meeting.accepted}
				/>
			);
		});
		
		return tableRows;
	}
	
	render() {
		let style = {
			header: {
				fontSize: 16,
				color: 'black',
			},
		}
		
		return (
			<Table selectable={false}>
				<TableHeader displaySelectAll={false}>
					<TableRow>
						<TableHeaderColumn colSpan='2' style={style.header}>
							{this.props.day[0].date.toDateString()}
						</TableHeaderColumn>
					</TableRow>
				</TableHeader>
				<TableBody>
					{this.BuildTable()}
				</TableBody>
			</Table>
		);
	}
}

class DayTableEntry extends React.Component {
	render() {
		let style = {
			time: {
				width: 60,
			},
			
			data: {
				fontSize: 14,
			},
			
			nested: {
				fontSize: 14,
				paddingTop: 0,
				paddingBottom: 0,
			},
		};
		
		return (
			<TableRow>
				<TableRowColumn style={style.time}>
					{this.props.time}
				</TableRowColumn>
				<TableRowColumn>
					<List>
						<ListItem
							style={style.data}
							primaryText={this.props.title}
							initiallyOpen={false}
							disabled={true}
							nestedItems={[
								<ListItem
									style={style.nested}
									insetChildren={true}
									disabled={true}
									primaryText={'Creator: ' + this.props.creator}
								/>,
								<ListItem
									style={style.nested}
									insetChildren={true}
									disabled={true}
									primaryText={'Length: ' + this.props.length + ' minutes'}
								/>,
								<ListItem
									style={style.nested}
									insetChildren={true}
									disabled={true}
									primaryText={'Invited: ' + (this.props.invited? 'Yes' : 'No') }
								/>,
								<ListItem
									style={style.nested}
									insetChildren={true}
									disabled={true}
									primaryText={'Attending: ' + (this.props.accepted? 'Yes' : 'No') }
								/>
							]}
						/>
					</List>
				</TableRowColumn>
			</TableRow>
		);
	}
}