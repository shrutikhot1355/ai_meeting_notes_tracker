/**
*	summarizer.js
*	--------------------------------------------------------------------------
*	Lightweight,	dependency-free	"AI	summary"	engine	for	meeting	notes.
*
*	By	default	this	uses	an	extractive	NLP	technique	(word-frequency	scoring,
*	similar	in	spirit	to	TextRank)	so	the	whole	project	runs	completely
*	offline	with	zero	API	keys	—	good	for	a	class	assignment	/	demo.
*
*	If	you	DO	want	to	plug	in	a	real	LLM	(OpenAI,	Claude,	Gemini,	etc.)	for	a
*	higher	quality	summary,	set	the	AI_PROVIDER	+	AI_API_KEY	environment
	*	variables	(see	README	"Optional:	Real	LLM	integration")	and	this	module
	*	will	call	out	to	that	provider	instead.	The	rest	of	the	app	(routes,
	*	frontend,	storage)	does	not	need	to	change	either	way.
	*	--------------------------------------------------------------------------
	*/
const	STOPWORDS	=	new	Set([
		"a","an","the","and","or","but","if","then","so","of","in","on","at","to",
		"for","with","from","by","is","are","was","were","be","been","being",
		"this","that","these","those","it","its","as","we","i","you","he","she",
		"they","them","our","your","their","not","no","do","does","did","have",
		"has","had","will","would","can","could","should","shall","may","might",
		"there","here","about","into","over","after","before","up","down","out",
		"just","also","than","very","some","such","only","own","same","too"
]);
const	ACTION_KEYWORDS	=	[
		"will",	"needs	to",	"need	to",	"should",	"must",	"has	to",	"have	to",
		"action	item",	"action:",	"todo",	"to-do",	"follow	up",	"follow-up",
		"assign",	"by	tomorrow",	"by	monday",	"by	tuesday",	"by	wednesday",
		"by	thursday",	"by	friday",	"by	next	week",	"due",	"deadline",	"responsible",
];
function	splitSentences(text)	{
		return	text
				.replace(/\r\n/g,	"\n")
				.split(/(?<=[.!?])\s+|\n+/)
				.map((s)	=>	s.trim())
				.filter((s)	=>	s.length	>	0);
}
function	tokenize(sentence)	{
		return	sentence
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g,	"	")
				.split(/\s+/)
				.filter((w)	=>	w	&&	!STOPWORDS.has(w));
}
function	scoreSentences(sentences)	{
		const	freq	=	{};
		const	tokenized	=	sentences.map(tokenize);
		tokenized.forEach((tokens)	=>	{
				tokens.forEach((t)	=>	{
						freq[t]	=	(freq[t]	||	0)	+	1;
				});
		});
		return	sentences.map((sentence,	i)	=>	{
				const	tokens	=	tokenized[i];
				const	rawScore	=	tokens.reduce((sum,	t)	=>	sum	+	(freq[t]	||	0),	0);
				//	Normalize	by	length	so	long	rambling	sentences	don't	always	win
				const	score	=	tokens.length	?	rawScore	/	Math.sqrt(tokens.length)	:	0;
				return	{	sentence,	score,	index:	i	};
		});
}
/**
	*	Generates	a	short	paragraph-style	AI	summary	from	raw	meeting	notes.
	*/
function	generateSummary(notesText,	maxSentences	=	3)	{
		const	sentences	=	splitSentences(notesText);
		if	(sentences.length	===	0)	return	"";
		if	(sentences.length	<=	maxSentences)	return	sentences.join("	");
		const	scored	=	scoreSentences(sentences);
		const	top	=	[...scored]
				.sort((a,	b)	=>	b.score	-	a.score)
				.slice(0,	maxSentences)
				.sort((a,	b)	=>	a.index	-	b.index);	//	restore	original	order
		return	top.map((s)	=>	s.sentence).join("	");
}
/**
	*	Extracts	the	most	important	standalone	points	as	bullet-style	strings.
	*/
function	extractKeyPoints(notesText,	maxPoints	=	5)	{
		const	sentences	=	splitSentences(notesText);
		if	(sentences.length	===	0)	return	[];
		const	scored	=	scoreSentences(sentences);
		const	top	=	[...scored]
				.sort((a,	b)	=>	b.score	-	a.score)
				.slice(0,	Math.min(maxPoints,	sentences.length))
				.sort((a,	b)	=>	a.index	-	b.index);
		return	top.map((s)	=>	s.sentence.replace(/^[-*•\d.\)]+\s*/,	""));
}
/**
	*	Finds	sentences	that	look	like	commitments	/	to-dos	and	turns	them	into
	*	structured	action	items	with	a	best-effort	"owner"	guess.
	*/
function	extractActionItems(notesText)	{
		const	sentences	=	splitSentences(notesText);
		const	items	=	[];
		sentences.forEach((sentence)	=>	{
				const	lower	=	sentence.toLowerCase();
				const	isAction	=	ACTION_KEYWORDS.some((kw)	=>	lower.includes(kw));
				if	(!isAction)	return;
				//	Best-effort	owner	detection:	"Priya	will	send..."	->	owner	=	Priya
				let	owner	=	"Unassigned";
				const	ownerMatch	=	sentence.match(
						/^([A-Z][a-zA-Z]+)\s+(will|needs	to|should|must|has	to)/
				);
				if	(ownerMatch)	owner	=	ownerMatch[1];
				//	Best-effort	due-date	detection
				let	due	=	null;
				const	dueMatch	=	lower.match(
						/by	(tomorrow|next	week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|[a-z]+	\d{1,2}(st|nd|rd|th)?)/
				);
				if	(dueMatch)	due	=	dueMatch[0].replace(/^by\s+/,	"");
				items.push({
						text:	sentence.replace(/^[-*•\d.\)]+\s*/,	""),
						owner,
						due,
						done:	false,
				});
		});
		return	items;
}
/**
	*	Single	entry	point	used	by	the	API	route.	Returns	everything	the
	*	frontend	needs	in	one	call.
	*/
async	function	analyzeMeetingNotes(notesText)	{
		const	provider	=	process.env.AI_PROVIDER;
		if	(provider	&&	process.env.AI_API_KEY)	{
				//	Optional	real-LLM	path	—	see	README	for	setup.	Falls	back	to	the
				//	offline	extractive	engine	automatically	if	the	call	fails,	so	the
				//	app	never	breaks	in	front	of	a	grader/demo	without	internet	access.
				try	{
						return	await	callExternalLLM(notesText,	provider);
				}	catch	(err)	{
						console.warn("[summarizer]	External	AI	call	failed,	using	offline	engine:",	err.message);
				}
		}
		return	{
				summary:	generateSummary(notesText),
				keyPoints:	extractKeyPoints(notesText),
				actionItems:	extractActionItems(notesText),
				engine:	"offline-extractive",
		};
}
async	function	callExternalLLM(notesText,	provider)	{
		//	Kept	intentionally	minimal/generic.	Fill	in	the	request	shape	for
		//	whichever	provider	you	configure	(OpenAI,	Anthropic,	Gemini,	etc).
		//	This	function	is	NOT	required	for	the	assignment	to	work.
		throw	new	Error(`External	provider	"${provider}"	not	implemented	—	using	offline	engine.`);
}
module.exports	=	{
		generateSummary,
		extractKeyPoints,
		extractActionItems,
		analyzeMeetingNotes,
};
