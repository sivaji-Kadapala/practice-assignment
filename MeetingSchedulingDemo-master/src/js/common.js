export const timeArray = [
	'8:00AM',
	'8:30AM',
	'9:00AM',
	'9:30AM',
	'10:00AM',
	'10:30AM',
	'11:00AM',
	'11:30AM',
	'12:00PM',
	'12:30PM',
	'1:00PM',
	'1:30PM',
	'2:00PM',
	'2:30PM',
	'3:00PM',
	'3:30PM',
	'4:00PM',
	'4:30PM',
	'5:00PM',
	'5:30PM',
	'6:00PM',
	'6:30PM',
	'7:00PM',
	'7:30PM',
	'8:00PM',
];

export function GetDateString(date) {
	let ds = date.getUTCFullYear() 
			+ '-' 
			+ (date.getUTCMonth() + 1)
			+ '-' 
			+ date.getUTCDate();
					
	return ds;
}