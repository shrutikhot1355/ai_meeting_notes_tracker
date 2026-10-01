/**
*	store.js
*	--------------------------------------------------------------------------
*	Very	small	JSON-file	"database"	for	saved	meetings.	This	is	enough	for	a
*	single-user	class	assignment;	swap	for	MongoDB/SQLite/etc.	if	you	extend
*	the	project	later	—	only	this	file	would	need	to	change.
*	--------------------------------------------------------------------------
*/
const	fs	=	require("fs");
const	path	=	require("path");
const	crypto	=	require("crypto");
const	DATA_FILE	=	path.join(__dirname,	"..",	"data",	"meetings.json");
function	ensureDataFile()	{
if	(!fs.existsSync(DATA_FILE))	{
fs.mkdirSync(path.dirname(DATA_FILE),	{	recursive:	true	});
fs.writeFileSync(DATA_FILE,	"[]",	"utf-8");
}
}
function	readAll()	{
ensureDataFile();
const	raw	=	fs.readFileSync(DATA_FILE,	"utf-8");
try	{
return	JSON.parse(raw);
}	catch	{
return	[];
}
}
function	writeAll(meetings)	{
ensureDataFile();
fs.writeFileSync(DATA_FILE,	JSON.stringify(meetings,	null,	2),	"utf-8");
}
function	getAllMeetings()	{
return	readAll().sort(
(a,	b)	=>	new	Date(b.createdAt)	-	new	Date(a.createdAt)
);
}
function	getMeetingById(id)	{
return	readAll().find((m)	=>	m.id	===	id)	||	null;
}
function	saveMeeting({	title,	notes,	summary,	keyPoints,	actionItems	})	{
const	meetings	=	readAll();
const	meeting	=	{
id:	crypto.randomUUID(),
title:	title	&&	title.trim()	?	title.trim()	:	"Untitled	Meeting",
notes,
summary,
keyPoints,
actionItems,
createdAt:	new	Date().toISOString(),
};
meetings.push(meeting);
writeAll(meetings);
return	meeting;
}
function	deleteMeeting(id)	{
const	meetings	=	readAll();
const	filtered	=	meetings.filter((m)	=>	m.id	!==	id);
writeAll(filtered);
return	filtered.length	!==	meetings.length;
}
function	toggleActionItem(meetingId,	itemIndex)	{
const	meetings	=	readAll();
const	meeting	=	meetings.find((m)	=>	m.id	===	meetingId);
if	(!meeting	||	!meeting.actionItems[itemIndex])	return	null;
meeting.actionItems[itemIndex].done	=	!meeting.actionItems[itemIndex].done;
writeAll(meetings);
return	meeting;
}
module.exports	=	{
getAllMeetings,
getMeetingById,
saveMeeting,
deleteMeeting,
toggleActionItem,
};
