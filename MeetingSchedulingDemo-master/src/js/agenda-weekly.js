import React from 'react';
import ReactDOM from 'react-dom';
import * as FBConnection from './firebaseconnect';
import * as Auth from './authentication';
import {timeArray, GetDateString} from './common';
import '../css/agenda.css';

// Material-UI theme and component libraries.
import Paper from 'material-ui/Paper';
import {GridList, GridTile} from 'material-ui/GridList';
import Popover from 'material-ui/Popover';
import {List, ListItem} from 'material-ui/List';

const fbDB = FBConnection.fbApp.database();

export class WeeklyAgendaView extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			days: [],
			meetingArrays: [],
		};
	}
	
	componentWillMount = () => {
		let dayArray = GetDaysOfCurrentWeek(this.props.date);
		
		this.setState({ days: dayArray });
	}
	
	componentDidMount = () => {
		this.GetMeetingArray(this.state.days);
	}
	
	componentWillReceiveProps = (nextProps) => {
		// update our meetingArray whenever the date prop changes.
		let days = GetDaysOfCurrentWeek(nextProps.date);
		if (GetDateString(days[0]) !== GetDateString(this.state.days[0])) {
			this.GetMeetingArray(days);
			this.setState({ days: days });
		}
	}
	
	GetMeetingArray = (days) => {
		let meetingArrays = [];
		// grab all of the days and their meetings for this week.
		let meetingRef = fbDB.ref('/meetings/').orderByKey()
			.startAt(GetDateString(days[0])).endAt(GetDateString(days[6]));
		meetingRef.once('value').then((snapshot) => {
			// grab the users so we can get the creator name.
			fbDB.ref('/users/').once('value').then((users) => {
				let currentUser = users.child(Auth.fbAuth.currentUser.uid);
				for (let i = 0; i < 7; i++) {
					let meetingArray = [];
					let date = GetDateString(days[i])
					let dayList = snapshot.child(date);
					// if there are meetings for day i, process them.
					if (dayList.val()) {
						dayList.forEach((meeting) => {
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
					}
					meetingArrays.push(meetingArray);
				}
				
				this.setState({ meetingArrays: meetingArrays });
			});
		});
	}
	
	BuildGridTitles = () => {
		let tileArray = [];
		
		tileArray.push(
			<GridTile className='grid-tile-title' rows={1} title='Time'>
			</GridTile>
		);
		
		for (let i = 0; i < 7; i++) {
			tileArray.push(
				<GridTile className='grid-tile-title' rows={1} 
					title={this.state.days[i].toLocaleDateString()}
				>
				</GridTile>
			);
		}
		
		return tileArray;
	}
	
	BuildDailyGrid = (index) => {
		let meetingArray = this.state.meetingArrays[index];
		if (!meetingArray) {
			meetingArray = [];
		}
		
		let tileArray = [];
	
		let iMeet = 0; //index into meetingArray
		let skip = 0;
		for (let i = 0; i < 25; i++) {
			let row = 1;
			
			if (skip === 0) {
				// if the current time slot matches our next meeting,
				if (iMeet < meetingArray.length) {
					let meeting = meetingArray[iMeet];
					if (timeArray[i] === meeting.time) {
						// we need to increase the row size, 
						// 1 row per 30 minutes.
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
								/>
							</GridTile>
						);
						
						skip = row - 1;
						iMeet++;
					} else {
						// we'll push a blank tile if we don't .
						//have a meeting in this slot.
						tileArray.push(
							<GridTile rows={row}>
								<GridViewBlank />
							</GridTile>
						);
					}
				} else {
					// if we have no meetings, we just want to 
					// fill up the schedule with blanks.
					tileArray.push(
						<GridTile rows={row}>
							<GridViewBlank />
						</GridTile>
					);
				}
			} else {
				// we're skipping if we had a meeting longer 
				// than 30 minutes as that meeting will have 
				// filled this timeslot/row.
				skip--;
			}
		}
		
		return tileArray;
	}
	
	BuildTimeGrid = () => {
		let tileArray = [];
		
		for (let i = 0; i < 25; i++) {
			// Push the time
			tileArray.push(
				<GridTile className='grid-tile-time' rows={1}>
					<GridViewBlank time={timeArray[i]} />
				</GridTile>
			);
		}
		
		return tileArray;
	}
	
	BuildWeeklyGrid = () => {
		let gridArray = [];
		
		for (let i = 0; i < 7; i++) {
			gridArray.push(
				<GridTile>
					<GridList 
						cols={1} 
						padding={0} 
						cellHeight={40}
					>
						{this.BuildDailyGrid(i)}
					</GridList>
				</GridTile>
			);
		}
		
		return gridArray;
	}
	
	render() {
		// build an 8 column grid of sub-grids.
		// each sub-grid will represent a day of the current week.
		return (
			<GridList cellHeight='auto' cols={8} padding={0}>
				{this.BuildGridTitles()}
				<GridTile>
					<GridList 
						cols={1} 
						padding={0} 
						cellHeight={40}
					>
						{this.BuildTimeGrid()}
					</GridList>
				</GridTile>
				{this.BuildWeeklyGrid()}
			</GridList>
		);
	}
}

class GridViewMeeting extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			open: false,
		};
	}
	
	handleClick = (e) => {
		let open = this.state.open;
		
		this.setState({ open: !open, anchor: e.currentTarget });
	}
	
	handleRequestClose = () => {
		this.setState({ open: false });
	}
	
	render() {
		const style = {
			width: '100%',
			height: '100%',
		}
		
		return (
			<div style={style} >
				<ClickableCell 
					onClick={this.handleClick}
					title={this.props.title} 
				/>
				<Popover
					open={this.state.open}
					anchorEl={this.state.anchor}
					anchorOrigin={{horizontal: 'middle', vertical: 'center'}}
					targetOrigin={{horizontal: 'left', vertical: 'top'}}
					onRequestClose={this.handleRequestClose}
				>
					<Paper zDepth={2}>
						<List>
							<ListItem disabled={true}
								primaryText={'Owner: ' + this.props.creator} 
							/>
							<ListItem disabled={true}
								primaryText={'Invited: ' + (this.props.invited? 'Yes' : 'No')} 
							/>
							<ListItem disabled={true}
								primaryText={'Attending: ' + (this.props.attending? 'Yes' : 'No')} 
							/>
						</List>
					</Paper>
				</Popover>
			</div>
		);
	}
}

class ClickableCell extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			hasMouse: false,
		};
		
		this.handleMouseEnter = this.handleMouseEnter.bind(this);
		this.handleMouseLeave = this.handleMouseLeave.bind(this);
		this.handleMouseClick = this.handleMouseClick.bind(this);
	}
	
	handleMouseEnter = () => {
		this.setState({ hasMouse: true });
		
		if (this.props.onEnter) {
			this.props.onEnter();
		}
	}
	
	handleMouseLeave = () => {
		this.setState({ hasMouse: false });
		
		if (this.props.onLeave) {
			this.props.onLeave();
		}
	}
	
	handleMouseClick = (e) => {
		if (this.props.onClick) {
			this.props.onClick(e);
		}
	}
	
	render() {
		const style = {
			nohover: {
				backgroundColor: '#80deea',
				width: '96%',
				height: '96%',
				margin: '2%',
				textAlign: 'center',
			},
			
			hover: {
				backgroundColor: '#4DD0E1',
				width: '96%',
				height: '96%',
				margin: '2%',
				textAlign: 'center',
				cursor: 'pointer',
			},
			
			text: {
				paddingTop: 5,
			}
		}
		
		return (
			<div
				style={this.state.hasMouse? style.hover : style.nohover}
				onMouseEnter={this.handleMouseEnter}
				onMouseLeave={this.handleMouseLeave}
				onClick={this.handleMouseClick}
			>
				<div style={style.text}>
					{this.props.title}
				</div>
			</div>
		);
	}
}
class GridViewBlank extends React.Component {
	render() {
		let style;
		if (this.props.time) {
			style = {
				backgroundColor: '#9e9e9e',
				color: 'white',
			};
		} else {
			style = {
				backgroundColor: '#F5F5F5',
			};
		}
		
		return (
			<Paper className='grid-view-meeting-paper-blank' 
				style={style} zDepth={0}
			>
				{this.props.time? this.props.time : null}
			</Paper>
		);
	}
}

function GetDaysOfCurrentWeek(date) {
	let day = date.getDay();

	// get how many days we need to subtract to get to the 
	// start of the week. Week starts on Monday in our 
	// calendar, but Sunday = 0 in JavaScript,
	// so we need to adjust for that.
	let diffToStart = (day - 1) < 0? 6 : day - 1;
		
	let dayArray = [];
	let startOfWeek = new Date(date);
	startOfWeek.setUTCDate(startOfWeek.getUTCDate() - diffToStart);
		
	for (let i = 0; i < 7; i++) {
		dayArray.push(new Date(startOfWeek));
		startOfWeek.setUTCDate(startOfWeek.getUTCDate() + 1);		
	}

	return dayArray;
}