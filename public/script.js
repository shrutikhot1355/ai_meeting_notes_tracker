//	--------------------------------------------------------------------------
//	AI	Meeting	Notes	&	Action	Tracker	—	frontend	logic
//	Talks	to	the	Express	API	defined	in	server.js
//	--------------------------------------------------------------------------
const	els	=	{
title:	document.getElementById("meetingTitle"),
notes:	document.getElementById("meetingNotes"),
analyzeBtn:	document.getElementById("analyzeBtn"),
saveBtn:	document.getElementById("saveBtn"),
clearBtn:	document.getElementById("clearBtn"),
status:	document.getElementById("status"),
results:	document.getElementById("results"),
summaryText:	document.getElementById("summaryText"),
keyPointsList:	document.getElementById("keyPointsList"),
actionItemsList:	document.getElementById("actionItemsList"),
historyList:	document.getElementById("historyList"),
modalOverlay:	document.getElementById("modalOverlay"),
modalContent:	document.getElementById("modalContent"),
closeModal:	document.getElementById("closeModal"),
};
let	lastAnalysis	=	null;	//	{	summary,	keyPoints,	actionItems	}
function	setStatus(message,	isError	=	false)	{
els.status.hidden	=	!message;
els.status.textContent	=	message;
els.status.className	=	"status"	+	(isError	?	"	error"	:	"");
}
function	renderActionItem(item,	index,	{	interactive	=	false,	meetingId	=	null	}	=	{})	{
const	li	=	document.createElement("li");
const	checkbox	=	document.createElement("input");
checkbox.type	=	"checkbox";
checkbox.checked	=	!!item.done;
checkbox.disabled	=	!interactive;
if	(interactive	&&	meetingId)	{
checkbox.addEventListener("change",	()	=>	toggleActionItem(meetingId,	index));
}
const	wrapper	=	document.createElement("span");
const	label	=	document.createElement("span");
label.textContent	=	item.text;
wrapper.appendChild(label);
const	meta	=	document.createElement("span");
meta.className	=	"meta";
meta.textContent	=	`Owner:	${item.owner	||	"Unassigned"}${item.due	?	"	·	Due:	"	+	item.due	:	""}`;
wrapper.appendChild(meta);
li.appendChild(checkbox);
li.appendChild(wrapper);
return	li;
}
function	renderAnalysis(analysis)	{
els.summaryText.textContent	=	analysis.summary	||	"(No	summary	could	be	generated.)";
els.keyPointsList.innerHTML	=	"";
(analysis.keyPoints	||	[]).forEach((point)	=>	{
const	li	=	document.createElement("li");
				li.textContent	=	point;
				els.keyPointsList.appendChild(li);
		});
		if	((analysis.keyPoints	||	[]).length	===	0)	{
				els.keyPointsList.innerHTML	=	'<li	class="empty-state">No	key	points	detected.</li>';
		}
		els.actionItemsList.innerHTML	=	"";
		(analysis.actionItems	||	[]).forEach((item,	i)	=>	{
				els.actionItemsList.appendChild(renderActionItem(item,	i));
		});
		if	((analysis.actionItems	||	[]).length	===	0)	{
				els.actionItemsList.innerHTML	=	'<li	class="empty-state">No	action	items	detected.</li>';
		}
		els.results.hidden	=	false;
}
async	function	analyzeNotes()	{
		const	notes	=	els.notes.value.trim();
		if	(!notes)	{
				setStatus("Please	enter	some	meeting	notes	first.",	true);
				return;
		}
		setStatus("Generating	AI	summary...");
		els.analyzeBtn.disabled	=	true;
		els.saveBtn.disabled	=	true;
		try	{
				const	res	=	await	fetch("/api/notes/analyze",	{
						method:	"POST",
						headers:	{	"Content-Type":	"application/json"	},
						body:	JSON.stringify({	notes	}),
				});
				if	(!res.ok)	throw	new	Error((await	res.json()).error	||	"Request	failed");
				lastAnalysis	=	await	res.json();
				renderAnalysis(lastAnalysis);
				setStatus("Summary	generated.	Review	it,	then	save	to	history.");
				els.saveBtn.disabled	=	false;
		}	catch	(err)	{
				setStatus(`Error:	${err.message}`,	true);
		}	finally	{
				els.analyzeBtn.disabled	=	false;
		}
}
async	function	saveMeeting()	{
		const	notes	=	els.notes.value.trim();
		if	(!notes	||	!lastAnalysis)	{
				setStatus("Generate	a	summary	before	saving.",	true);
				return;
		}
		setStatus("Saving	meeting...");
		try	{
				const	res	=	await	fetch("/api/meetings",	{
						method:	"POST",
						headers:	{	"Content-Type":	"application/json"	},
						body:	JSON.stringify({
								title:	els.title.value.trim(),
								notes,
								summary:	lastAnalysis.summary,
								keyPoints:	lastAnalysis.keyPoints,
								actionItems:	lastAnalysis.actionItems,
						}),
				});
				if	(!res.ok)	throw	new	Error((await	res.json()).error	||	"Request	failed");
				setStatus("Meeting	saved	to	history!");
				await	loadHistory();
		}	catch	(err)	{
				setStatus(`Error:	${err.message}`,	true);
		}
}
function	clearForm()	{
		els.title.value	=	"";
		els.notes.value	=	"";
		els.results.hidden	=	true;
		els.saveBtn.disabled	=	true;
		lastAnalysis	=	null;
		setStatus("");
}
async	function	loadHistory()	{
		try	{
				const	res	=	await	fetch("/api/meetings");
				const	meetings	=	await	res.json();
				if	(meetings.length	===	0)	{
						els.historyList.innerHTML	=	'<p	class="empty-state">No	meetings	saved	yet.</p>';
						return;
				}
				els.historyList.innerHTML	=	"";
				meetings.forEach((m)	=>	{
						const	card	=	document.createElement("div");
						card.className	=	"history-card";
						card.innerHTML	=	`
								<h3>${escapeHtml(m.title)}</h3>
								<div	class="date">${new	Date(m.createdAt).toLocaleString()}</div>
								<div	class="snippet">${escapeHtml(m.summary	||	m.notes)}</div>
						`;
						card.addEventListener("click",	()	=>	openMeetingModal(m.id));
						els.historyList.appendChild(card);
				});
		}	catch	(err)	{
				els.historyList.innerHTML	=	`<p	class="empty-state">Could	not	load	history:	${err.message}</p>`;
		}
}
async	function	openMeetingModal(id)	{
		try	{
				const	res	=	await	fetch(`/api/meetings/${id}`);
				if	(!res.ok)	throw	new	Error("Meeting	not	found");
				const	m	=	await	res.json();
				els.modalContent.innerHTML	=	`
						<h2>${escapeHtml(m.title)}</h2>
						<p	class="date">${new	Date(m.createdAt).toLocaleString()}</p>
						<h3>AI	Summary</h3>
<p	class="summary-box">${escapeHtml(m.summary	||	"(none)")}</p>
<h3>Key	Points</h3>
<ul	class="key-points">${(m.keyPoints	||	[]).map((p)	=>	`<li>${escapeHtml(p)}</li>`).join("")	||	'<li	class="empty-state">None</li>'}</ul>
<h3>Action	Items</h3>
<ul	class="action-items"	id="modalActionItems"></ul>
<h3>Raw	Notes</h3>
<p	class="summary-box">${escapeHtml(m.notes)}</p>
<div	class="actions">
<button	class="btn	btn--ghost"	id="deleteMeetingBtn">		Delete	meeting</button>
</div>
`;
const	list	=	document.getElementById("modalActionItems");
(m.actionItems	||	[]).forEach((item,	i)	=>	{
list.appendChild(renderActionItem(item,	i,	{	interactive:	true,	meetingId:	m.id	}));
});
if	((m.actionItems	||	[]).length	===	0)	{
list.innerHTML	=	'<li	class="empty-state">None	detected</li>';
}
document.getElementById("deleteMeetingBtn").addEventListener("click",	async	()	=>	{
if	(!confirm("Delete	this	meeting	from	history?"))	return;
await	fetch(`/api/meetings/${id}`,	{	method:	"DELETE"	});
closeModal();
loadHistory();
});
els.modalOverlay.hidden	=	false;
}	catch	(err)	{
setStatus(`Error:	${err.message}`,	true);
}
}
async	function	toggleActionItem(meetingId,	index)	{
await	fetch(`/api/meetings/${meetingId}/action-items/${index}`,	{	method:	"PATCH"	});
}
function	closeModal()	{
els.modalOverlay.hidden	=	true;
els.modalContent.innerHTML	=	"";
}
function	escapeHtml(str)	{
const	div	=	document.createElement("div");
div.textContent	=	str	??	"";
return	div.innerHTML;
}
//	---	Event	wiring	--
els.analyzeBtn.addEventListener("click",	analyzeNotes);
els.saveBtn.addEventListener("click",	saveMeeting);
els.clearBtn.addEventListener("click",	clearForm);
els.closeModal.addEventListener("click",	closeModal);
els.modalOverlay.addEventListener("click",	(e)	=>	{
if	(e.target	===	els.modalOverlay)	closeModal();
});
//	Initial	load
loadHistory();