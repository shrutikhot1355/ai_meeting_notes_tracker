/**
*	server.js
*	--------------------------------------------------------------------------
*	Problem	18	—	AI	Meeting	Notes	&	Action	Tracker	(Feature	Set	A)
*
*	Feature	Set	A	requirements	covered:
*			✔	Enter	meeting	notes								
*			✔	Generate	AI	summary								
*			✔	Extract	key	points									
*			✔	Display	action	items							
*			✔	Save	meeting	history							->	POST	/api/meetings	(with	textarea	UI)->	POST	/api/notes/analyze->	POST	/api/notes/analyze->	POST	/api/notes/analyze	+	saved	on	meeting->	POST	/api/meetings,	GET	/api/meetings
*	--------------------------------------------------------------------------
*/
const	express	=	require("express");
const	path	=	require("path");
const	{	analyzeMeetingNotes	}	=	require("./lib/summarizer");
const	store	=	require("./lib/store");
const	app	=	express();
const	PORT	=	process.env.PORT	||	3000;
app.use(express.json({	limit:	"1mb"	}));
app.use(express.static(path.join(__dirname,	"public")));
//	--------------------------------------------------------------------------
//	API:	Analyze	notes	->	AI	summary	+	key	points	+	action	items
//	--------------------------------------------------------------------------
app.post("/api/notes/analyze",	async	(req,	res)	=>	{
try	{
const	{	notes	}	=	req.body;
if	(!notes	||	!notes.trim())	{
return	res.status(400).json({	error:	"Meeting	notes	text	is	required."	});
}
const	result	=	await	analyzeMeetingNotes(notes);
res.json(result);
}	catch	(err)	{
console.error(err);
res.status(500).json({	error:	"Failed	to	analyze	meeting	notes."	});
}
});
//	--------------------------------------------------------------------------
//	API:	Save	a	meeting	to	history
//	--------------------------------------------------------------------------
app.post("/api/meetings",	(req,	res)	=>	{
try	{
const	{	title,	notes,	summary,	keyPoints,	actionItems	}	=	req.body;
if	(!notes	||	!notes.trim())	{
return	res.status(400).json({	error:	"Meeting	notes	text	is	required."	});
}
const	meeting	=	store.saveMeeting({
title,
notes,
summary:	summary	||	"",
keyPoints:	keyPoints	||	[],
actionItems:	actionItems	||	[],
});
res.status(201).json(meeting);
}	catch	(err)	{
console.error(err);
res.status(500).json({	error:	"Failed	to	save	meeting."	});
}
});
//	--------------------------------------------------------------------------
//	API:	Get	all	meetings	(history	list)
//	--------------------------------------------------------------------------
app.get("/api/meetings",	(req,	res)	=>	{
res.json(store.getAllMeetings());
});
//	--------------------------------------------------------------------------
//	API:	Get	a	single	meeting
//	--------------------------------------------------------------------------
app.get("/api/meetings/:id",	(req,	res)	=>	{
const	meeting	=	store.getMeetingById(req.params.id);
if	(!meeting)	return	res.status(404).json({	error:	"Meeting	not	found."	});
res.json(meeting);
});
//	--------------------------------------------------------------------------
//	API:	Toggle	an	action	item's	done	state
//	--------------------------------------------------------------------------
app.patch("/api/meetings/:id/action-items/:index",	(req,	res)	=>	{
const	meeting	=	store.toggleActionItem(req.params.id,	Number(req.params.index));
if	(!meeting)	return	res.status(404).json({	error:	"Meeting	or	action	item	not	found."	});
res.json(meeting);
});
//	--------------------------------------------------------------------------
//	API:	Delete	a	meeting
//	--------------------------------------------------------------------------
app.delete("/api/meetings/:id",	(req,	res)	=>	{
const	deleted	=	store.deleteMeeting(req.params.id);
if	(!deleted)	return	res.status(404).json({	error:	"Meeting	not	found."	});
res.status(204).send();
});
app.listen(PORT,	()	=>	{
console.log(`AI	Meeting	Notes	&	Action	Tracker	running	at	http://localhost:${PORT}`);
});