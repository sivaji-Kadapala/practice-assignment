import React from 'react';
import {DailyAgendaView} from './agenda-daily';
import {NewMeetingView} from './agenda-new';
import {WeeklyAgendaView} from './agenda-weekly';
import {GeneralAgendaView} from './agenda-general';
import '../css/agenda.css';

// Material-UI theme and component libraries.
import Paper from 'material-ui/Paper';
import Calendar from 'material-ui/DatePicker/Calendar';
import Dialog from 'material-ui/Dialog';
import {Tabs, Tab} from 'material-ui/Tabs';
import Snackbar from 'material-ui/Snackbar';

export class Agenda extends React.Component {
	constructor() {
		super();
		
		var d = new Date();
		this.state = {
			date: d,
		}
	}
	
	handleDate = (event, date) => {
		this.setState({ date: date });
	}
	
	checkDate = (date) => {
		// ensure dates available in calendar include only today forward.
		let now = new Date();
		now.setHours(0, 0, 0, 0);

		if (date < now) {
			return true;
		}
		
		return false;
	}
	
	render () {
		return (
			<div className='agenda-main'>
				<Paper className='calendar-sheet' zDepth={2}>
					<Calendar 
						firstDayOfWeek={1} 
						mode='portrait' 
						onTouchTapDay={this.handleDate}
						shouldDisableDate={this.checkDate}
					/>
				</Paper>
				<Paper className='agenda-sheet' zDepth={2}>
					<AgendaTabs date={this.state.date} />
				</Paper>
			</div>
		);
	}
}

class AgendaTabs extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			currentTab: 'agenda',
			error: null,
			meetingadded: false,
		};
	}
	
	handleTabChange = (tab) => {
		this.setState({ currentTab: tab });
	}
	
	handleAddMeeting = (added) => {
		this.setState({ meetingadded: added });
	}
	
	handleSnackbarClose = () => {
		this.setState({ meetingadded: false });
	}
	
	handleMeetingError = (err) => {
		this.setState({ error: err });
	}
	
	handleErrorClose = () => {
		this.setState({ error: null });
	}
	
	// only draw whichever of the three main tabs is selected.
	DrawDaily = (b) => {
		if (b) {
			return (
				<DailyAgendaView date={this.props.date} />
			);
		} else {
			return (<div></div>);
		}
	}
	
	DrawWeekly = (b) => {
		if (b) {
			return (
				<WeeklyAgendaView date={this.props.date} />
			);
		} else {
			return (<div></div>);
		}
	}
	
	DrawAgenda = (b) => {
		if (b) {
			return (
				<GeneralAgendaView date={this.props.date} />
			);
		} else {
			return (<div></div>);
		}
	}
	
	render() {
		return (
			<div>
				<Tabs
					value={this.state.currentTab}
					onChange={this.handleTabChange}
				>
					<Tab label='Agenda' value='agenda'>
						{this.DrawAgenda(this.state.currentTab === 'agenda')}
					</Tab>
					<Tab label='Day' value='day'>
						{this.DrawDaily(this.state.currentTab === 'day')}
					</Tab>
					<Tab label='Week' value='week'>
						{this.DrawWeekly(this.state.currentTab === 'week')}
					</Tab>
					<Tab label='New' value='new'>
						<NewMeetingView 
							date={this.props.date} 
							onAdd={this.handleAddMeeting}
							onError={this.handleMeetingError}
						/>
					</Tab>
				</Tabs>
				<Dialog
					open={this.state.error != null}
					onRequestClose={this.handleErrorClose}
				>
					{this.state.error}
				</Dialog>
				<Snackbar
					open={this.state.meetingadded}
					message='New meeting successfully added.'
					autoHideDuration={3000}
					onRequestClose={this.handleSnackbarClose}
				/>
			</div>
		);
	}
}