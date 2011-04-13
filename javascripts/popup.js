var background = chrome.extension.getBackgroundPage();

var isDebug = true && commonDebug;
var isDebugToBg = isDebug && false;

function log(s) {
    if (isDebug)
        console.log("popup::" + s);
    if (isDebugToBg)
        background.console.log("popup::" + s);
}

//  ---------------------------------------
// event listener for popup close
// defer save to background
addEventListener("unload", function (event) {
    log("unload listener");
    if (isNoteDirty()) {
        var note = {};
        log("unload listener: requesting background save");
        
        if ($('div#note textarea').attr("dirty")=="true")
            note.content = $('div#note textarea').val();
        if ($('div#note input#pinned').attr("dirty")=="true")
            note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag
        if ($('div#note input#tags').attr("dirty")=="true")
            note.tags = $('div#note input#tags').split(" ");
        
        note.key = $('div#note textarea').attr('key');
        
        background.saveNote = note;
        background.setTimeout("popupClosed()", 1);
    } else 
        log("unload listener: no background save");
}, true);

//  ---------------------------------------
// Log in on page load
$(document).ready(function() {
    background.console.log("------- popup opened");
    var signUpLink =  "<a href='https://simple-note.appspot.com/create/'>signup</a>";
    var optionsLink = "<a href='options.html'>options page</a>";

    if ( !localStorage.email || !localStorage.password) {
        var message = "Please " + signUpLink + " for a Simplenote account and enter your credentials on the " + optionsLink + ".";
        displayStatusMessage(message);
    }
    else {
    
        log("ready listener: requesting login");
        chrome.extension.sendRequest({
            action : "login"
        }, 
        function(result) {
            if (result.success) {
                log("ready listener: login success");

                if (localStorage.openToNote && localStorage.openToNote != "")
                    showNote(localStorage.openToNote);
                else
                    showIndex();

                //$("select, input, textarea").uniform();

                $('div#index div#toolbar div#add').click(function() {
                    showNote();
                });
    
                var options = {
                    callback : function() {
                        showIndex({type: "content",query:$('#q').val()});
                    },
                    wait : 250,
                    highlight : false,
                    captureLength : -1 // needed for empty string ('') capture
                };
                $('div#index div#toolbar input#q').typeWatch(options);

                $('div#index div#toolbar input#q').watermark("Search notes");
                $('div#note div#toolbar input#tags').watermark("Tag this note");
                //$('div#index div#toolbar input#search').click(function() {
                //    showIndex({type: "content",query:$('#q').val()});
                //});
                //$('div#index div#toolbar input#q').focus();
            }
            else {
                log("ready listener: login error, message=" + result.message);
                if (!result.message)
                    result.message = "Please correct your username and password on the " + optionsLink + "!";
                else
                    result.message += "<br><br>Alternatively you can try to correct your username and password on the " + optionsLink + "!";
                displayStatusMessage(result.message);
            }
        });
    }
});


//  ---------------------------------------
/*
 * Displays a status message.
 * @param message The HTML content of the status message to display. All links
 *     in the message are be adjusted to open in a new window and close the
 * ß    popup.
 */
function displayStatusMessage(message) {
    $('#loader').hide();
    $('#toolbar').hide();
    $('#status').html(message);
    links = $('a');
    links.attr('target', '_blank');
    links.click(function() {
        window.close();
    }
    );
}

//  ---------------------------------------
function fillTags() {    
    chrome.extension.sendRequest({action:"tags"}, function(tags) {
        // fill dropdown
        var val = $("#notetags").val();
        $("#notetags").html("");
        $("#notetags").append('<option value="">(show all)</option>');
        $("#notetags").append('<option value="#notag#">(untagged)</option>');
        $("#notetags").append('<option value="#trash#">(trash)</option>');
        $.each(tags,function(i,tag) {            
            $("#notetags").append('<option value="' + tag + '">' + tag + '</option>');
        });
        $("#notetags").val(val);
        
        // add handler
        $("#notetags").unbind();
        $("#notetags").change(function(event) {            
            showIndex({type: "tags", query: $(this).val()});
        });        
    });
}
//  ---------------------------------------
var lastQuery;
function showIndex(query) {    
    var req;
    if (!query && lastQuery)
        query = lastQuery;
    
    if (query !== undefined && query.query != '') {
        req = { action : "search", query : query, deleted : 0 };            
        lastQuery = query;
    } else {
        req = { action : "index", deleted: 0};
        lastQuery = undefined;        
    }
  
    log("showIndex" + (query?":query type=" + query.type + ", query=" + query.query:""));
  
    $('div#notes').unbind("scroll");
    $('div#notes').scroll(checkInView);
    $('div#index').show("fast");
    $('div#index div#notes').empty();
    fillTags();
   
    chrome.extension.sendRequest(req, function(indexData) {     
        // indexData[] for search
        //      .content:   string
        //      .key:       string
    
        //var now = new Date(Date.now());
        //var lastUpdate = $('div#index').data("updated");
        //if (!lastUpdate) lastUpdate = new Date(0);

//        var indexDataOld, indexDataNew;
//
//        if (!query) {
//            indexDataOld = indexData.filter(function (e) {
//                return convertDate(e.modifydate) < lastUpdate;
//            });
//            indexDataNew = indexData.filter(function (e) {
//                return convertDate(e.modifydate) >= lastUpdate;
//            });
//
//            // check for removals, remove divrows not in result
//            var keys = indexData.map(function(e) {
//                return e.key;
//            });
//            var keyRows = $("div.noterow").get().map(function(e) {
//                return e.id;
//            });
//            keyRows.map(function(rowKey) {
//                if (keys.indexOf(rowKey)<0) $('div.noterow#' + rowKey).remove();
//            });
//        } else {
//            indexDataOld = indexData;
//            indexDataNew = new Array();
//            $.each(indexData, function (i,e) { $("#" + e.key).show(); });
//        }
        
//        log("showIndex: request complete, " + indexDataOld.length + " old, " + indexDataNew.length + " new notes");
    
        // check old ones
//        for(var i = 0; i < indexDataOld.length; i ++ ) {
//            if (indexDataOld[i].modifydate) { //index
//            //modify = $('div.noterow#' + indexDataNoDeletedOld[i].key).data("modify");
//            //if (modify != serverDateStrToLocalDate(indexDataNoDeletedOld[i].modify))
//            //    log("modify date different from saved date! (" + indexDataNoDeletedOld[i].key + ")");
//            //log(modify);
//            //log(typeof(serverDateStrToLocalDate(indexDataNoDeletedOld[i].modify)));
//            } else { // search
//                var notediv = $('#' + indexDataOld[i].key);
//                if (!notediv) // TODO: there might be more problems, i.e. ordering
//                    indexDataNew.push(indexDataOld[i]);
//                else {
//                    $('#' + indexDataOld[i].key).show();
//                }
//            }
//        }
    
        // add new ones
        //if (!$('div#index').data("updated")) // first run
        if (indexData.length > 0)
            for(var i = 0; i < indexData.length; i ++ )
                indexAddNote("append",indexData[i]);
        else
            $('div#index div#notes').html("no notes found.");
        // else
        //    for(i = indexDataNew.length-1; i >= 0; i-- )
        //        indexAddNote("delteAndPrepend",indexDataNew[i]);

        
        //$('div#index').show();
        $('#loader').hide();
//        $('div#index').data("updated",now);
  
        checkInView();        
    });
  
}

//mode: delteAndPrepend, append
function indexAddNote(mode, note){
            
    var html =  "<div class='noterow' id='" + note.key  + "' >";
    html+=          "<span class='notetime' id='" + note.key + "time'>" + gettimeadd(note.modifydate);
    if (note.deleted == 0)
        html+=          "<div class='" + (note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned") + "' id='" + note.key + "pin'>&nbsp;</div>";
    html+=          "</span>";
    html+=          "<div contenteditable='false' class='noteheading' id='" + note.key + "heading'>";
    html+=          "</div>";
    html+=          "<div contenteditable='false' class='abstract' id='" + note.key + "abstract'>&nbsp;<br>&nbsp;</div>";
    
    html+=      "</div>";        
    
    if (mode=="delteAndPrepend") {
        $('div.noterow#' + note.key).remove();
        $('#notes').prepend(html);                
    } else if (mode=="append") {
        $('#notes').append(html);        
    }
    
    if (note.deleted != 0)
        return

    $("#" + note.key +"pin").unbind();
    $("#" + note.key +"pin").click(note.key,function(event) {
            var tag = $(this).attr("class")=="pinned"?[]:["pinned"];
            event.stopPropagation();
            chrome.extension.sendRequest({action:"update",key:event.data,systemtags:tag}, function (note) {
                $("#" + note.key +"pin").attr("class",note.systemtags.indexOf("pinned")>=0?"pinned":"unpinned");
                showIndex();
            });
        }); 
    
    //$('div.noterow#' + note.key).data("modify",note.modifydate);
}


// element: jquery div.noterow#key
function indexFillNote(element) {        
    
    var key = element.attr("id");

    // reflowing triggers scrolls
    if (element.data("requested"))
        return;

    $('#' + key + "heading").append('<img id="' +key + 'loader" src="images/loader_small.gif"/>');
    $('#' + key + "heading").attr("align","center");

    chrome.extension.sendRequest({
        action : "note", 
        key :key
    }, function(note) {
        // fields: noteData.key, noteData.text
        
        var $noterow = $('#' + note.key);
        var $noteheading = $('#' + note.key + "heading");
        var $abstract = $('#' + note.key + "abstract");
            
        var lines = note.content.split("\n").filter(function(line) {
            return ( line.trim().length > 0 )
            });

        // first line
        $('#' + key + 'loader').remove();
        $noteheading.removeAttr("align");
        $noteheading.append(htmlEncode(lines[0]));
        if (note.deleted == 1) {
            $noteheading.addClass("noteheadingdeleted"); // for text color
            $noterow.addClass("noterowdeleted"); // for undelete image on hover
        }

        // abstract
        $abstract.html(htmlEncode(lines.slice(1,Math.min(lines.length,localStorage.abstractlines*1+1))).join("<br />"));
                
        // add dblclick binding
        $noterow.css("height",$noterow.height());
        $noterow.data('origheight',$noterow.height());
        $noterow.dblclick(maximize);
                
        // add click binding        
        $noterow.unbind();
        if (note.deleted == 0)
            $noterow.click(function() {
                showNote(this.id)
            });
        else
            $noterow.click(function() {
                chrome.extension.sendRequest({
                    action : "update",
                    key : note.key,
                    deleted : 0
                    }, function() {
                        showIndex();
                    });
            });
        
        //$noterow.hover(maximize,minimize);
        
        // save full note
        //$noterow.data('fulltext',noteData.content);
        
        // check new inview, might have changed due to reflow
        $noterow.data('loaded',true);        
        checkInView();
    });

    element.data("requested",true);    
}

function makeAbstract(lines) {
    var abstracttext = lines.map(function(element) { 
        var shorttext = element.substr(0, 45); 
        return shorttext.length + 3 < element.length ? shorttext + "..." : element;
    });
    return htmlEncode(abstracttext).join("<br />");
}

// encode string or string array into html equivalent
function htmlEncode(s)
{
    if (!s)
        return "";
    if (s instanceof Array)
        return s.map(function(s) {
            return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
        });
    else
        return htmlSafe(s).replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;");
}

// make string html safe
function htmlSafe(s) {
    return s.replace(/&(?!\w+([;\s]|$))/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function maximize(event) {
    var key = this.id;
    var $this = $(this);
    var lines = $this.data("fulltext").split("\n");
    
    // insert full text into abstract div
    //$('#' + key + 'abstract').html(htmlEncode(lines.slice(1,lines.length-1)));
    
    //$('div.noterow').not($(this)).trigger('mouseleave');
    //$('div.noterow').not($(this)).stop( true, false );
    
    // animate 
    var $clone = $this.clone().css({
        height: 'auto', 
        position: 'absolute', 
        zIndex: '-9999', 
        left: '-9999px', 
        width: $this.width()
    })
    .appendTo($this);    
    $this.animate({
        height: $clone.height()
    }, 100);    
    $clone.detach();
    
    $this.unbind('dblclick');
    $this.dblclick(minimize);
//$('#' + key).animate( {height:'+=' + (lines*10), duration:500 }, function(){
//$('#' + key).removeAttr('style');
//});
// $('#' + key).slideDown();

//$('html,body').animate({scrollTop: $(this).offset().top}, 100);
}

function minimize(event) {
    var key = this.id;
    var $this = $(this);
    var lines = $(this).data("fulltext").split("\n",10).filter(function(line) {
        return ( line.length > 1 )
        });
    
    //$('#' + key + "abstract").html(makeAbstract(lines.slice(1, 3)));
        
    $this.animate({
        height: $this.data('origheight')
    }, 50);

    $this.unbind('dblclick');
    $this.dblclick(maximize);    
}

//  ---------------------------------------
function gettimeadd(s) {
    var now = new Date(Date.now());
    var mod = convertDate(s);
  
    var diff = (now - mod) / 1000 / 60 / 60;
    var timeadd;

    if (diff < 24) {
        timeadd = pad(mod.getHours()) + ":" + pad(mod.getMinutes());
    }
    else {
        timeadd = mod.getDate() + "." + (mod.getMonth()+1) + ".";
    }

    return timeadd;
}

//  ---------------------------------------

function pad(i) {
    if (i < 10) return "0" + i;
    else return "" + i;
}

//  ---------------------------------------

function showNote(key) {
    log("showNote");
  
    $('div#index').hide("fast");  
    $('#loader').show();  
    $('div#note').show("fast");

    $('div#note div#toolbar input').removeAttr('disabled');    
    $("div#note input").removeAttr("dirty");
    // dont work:
    //$('div#note textarea#editor').scrollTop(0);
    //$('div#note textarea#editor').scrollLeft(0);
    // add note content change (dirty) event listeners
    $('div#note textarea').unbind();
    $('div#note textarea').bind('change keyup paste', function(event) {
        var note = $(this).data("note");
        if (note.content != $(this).val()) {
            log("note content is dirty (" + event.type + ")");
            $('div#note textarea').attr('dirty', 'true');
        } else {
            log("note content not dirty (" + event.type + ")");
            $('div#note textarea').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });
    
    // add note tags change (dirty) event listeners
    $('div#note input#tags').unbind();
    $('div#note input#tags').bind('change keyup paste', function(event) {
        var note = $('div#note textarea').data("note");
        if (note.tags.join(" ") != $(this).val().trim()) {
            log("tags dirty (" + event.type + ")");
            $('div#note input#tags').attr('dirty', 'true');
        } else {
            log("tags not dirty (" + event.type + ")");
            $('div#note input#tags').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });
    
    // add note pinned (dirty) event listeners
    $('div#note input#pinned').unbind();
    $('div#note input#pinned').bind('change', function(event) {
        var note = $('div#note textarea').data("note");
        var waspinned = note.systemtags.indexOf("pinned")>=0;
        
        if (waspinned != $("div#note input#pinned").attr("checked")) {
            log("pinned dirty (" + event.type + ")");
            $('div#note input#pinned').attr('dirty', 'true');
        } else {
            log("pinned not dirty (" + event.type + ")");
            $('div#note input#pinned').removeAttr('dirty');
        }
        if (isNoteDirty())
            $('div#note input#undo').removeAttr("disabled");
        else
            $('div#note input#undo').attr("disabled","true");
    });

    // bind back button
    $('div#note input#backtoindex').unbind();
    $('div#note input#backtoindex').click(function() {
        log("back clicked");
        if (isNoteDirty()) 
            updateNote(backToIndex);
        else
            backToIndex();   
    });
  
    // get note contents
    if (key === undefined) { // new note
        
        // delete button now cancel button
        $('div#note div#toolbar input#destroy').val("Cancel");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            backToIndex();
        });
    
        // insert data
        $('div#note textarea').val("");
        $('div#note textarea').attr('key', '');
        $('div#note div#info').html("");
        // dummy note data
        var note = {content:"",tags:[],systemtags:[]};
        $('div#note textarea').data("note",note);

        // show/hide elements
        $('#loader').hide();  
        //$('div#note input#pinned').hide();
        //$('div#note input#pinned').html("");
        //$('div#note input#tags').hide();
        $('div#note input#undo').hide();
        $('div#note textarea').show();
        $('div#note textarea').focus();    
    }
    else { // existing note, request from server
        
        // bind delete button
        $('div#note div#toolbar input#destroy').val("Delete");
        $('div#note input#destroy').unbind();
        $('div#note input#destroy').click(function() {
            trashNote();
        });

        // bind undo button
        $('div#note input#undo').unbind();
        $('div#note input#undo').click(key,function(event) {            
            showNote(event.data);
        });
        $('div#note input#undo').attr("disabled","true");
        $('div#note input#undo').show();
        
        // request note
        chrome.extension.sendRequest({
            action : "note", 
            key : key
        }, function(note) {
            log("showNote: note request complete");
            // insert data
            $('div#note textarea').val(note.content);
            $('div#note input#tags').val(note.tags.join(" "));
            $('div#note textarea').attr('key', key); 
            $('div#note textarea').data("note",note);
            if (note.systemtags.indexOf("pinned")>=0)
                $('div#note input#pinned').attr("checked","checked");
            else
                $('div#note input#pinned').removeAttr("checked");
            
            // info div
            $('div#note div#info').html(note2str(note));
            // show/hide elements
            $('#loader').hide();  
            $('div#note input#pinned').show();
            $('div#note input#pinned').html("&nbsp;&nbsp;&nbsp;&nbsp;pinned");
            $('div#note input#tags').show();
            $('div#note textarea').show();      
            $('div#note textarea').focus();

            localStorage.openToNote = note.key;
        });
    }  

}

//  ---------------------------------------

function updateNote(callback) {
    
    var key = $('div#note textarea').attr('key');
    
    note = {};
    if ($('div#note textarea').attr("dirty")=="true")
        note.content = $('div#note textarea').val();
    if ($('div#note input#pinned').attr("dirty")=="true")
        note.systemtags = $('div#note input#pinned').attr("checked")?["pinned"]:[]; // todo: "read" systag
    if ($('div#note input#tags').attr("dirty")=="true")
        note.tags = $('div#note input#tags').val().trim().split(" ");

    log("updateNote:callback " + callback);
    log(note);
    
    if (note.content == '' && key !='')     // existing note emptied -> trash
        trashNote();
    else if (key != '' ) {                  // existing note, new data -> update
        note.key = key;
        note.action = "update";
    } else if (note.content != '')          // new note, new data -> create
        note.action = "create";
    else                                    // new note, no data -> back to index
        backToIndex();
    
        
    if (note.action) {
        log("updateNote:request:");
        log(note);
        chrome.extension.sendRequest(note, function(note) {
            $('div#note textarea').attr('key',note.key);
            $('div#note textarea').removeAttr('dirty');  
            $('div#note input#pinned').removeAttr("dirty");
            $('div#note input#tags').removeAttr('dirty');
            log("updateNote: request complete");   
            if (callback)
                callback();
        });
    }
    
}

//  ---------------------------------------

function isNoteDirty() {
    return $('div#note textarea').attr("dirty")=="true" ||
        $('div#note input#pinned').attr("dirty")=="true" ||
        $('div#note input#tags').attr("dirty")=="true";
}

//  ---------------------------------------

function backToIndex() {
    log("backToIndex");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    $('div#note textarea').hide();
    $('div#note').hide();
    localStorage.openToNote = "";
    
    showIndex();
}

//  ---------------------------------------

function trashNote() {
    log("trashNote");
    $('div#note div#toolbar input').attr('disabled', 'disabled');
    
    chrome.extension.sendRequest({
        action : "update", 
        key : $('div#note textarea').attr('key'),
        deleted : 1
        }, function() {
        backToIndex();
    });
}

//  ---------------------------------------
// from inview.js
function getViewportSize() {
    var mode, domObject, size = {
        height: window.innerHeight, 
        width: window.innerWidth
    };

    // if this is correct then return it. iPad has compat Mode, so will
    // go into check clientHeight/clientWidth (which has the wrong value).
    if (!size.height) {
        mode = document.compatMode;
        if (mode || !$.support.boxModel) { // IE, Gecko
            domObject = mode === 'CSS1Compat' ?
            document.documentElement : // Standards
            document.body; // Quirks
            size = {
                height: domObject.clientHeight,
                width:  domObject.clientWidth
            };
        }
    }

    return size;
}

function getViewportOffset() {
    return {
        top:  window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
    };
}

// amount of vertical viewport size to add for preloading
var preLoadFactor = 1/4;
function checkInView() {
    var elements = $('div.noterow').get(), elementsLength, i = 0, viewportSize, viewportOffset;
    var allLoaded = true;
    
    elements = elements.filter(function (e) {
        return !$(e).data('loaded');
    });
    
    elementsLength = elements.length;

    if (elementsLength) {
        viewportSize   = getViewportSize();
        viewportOffset = getViewportOffset();

        
        for (; i<elementsLength; i++) {

            var $element      = $(elements[i]),
            elementSize   = {
                height: $element.height(), 
                width: $element.width()
            },
            elementOffset = $element.offset(),
            loaded        = $element.data('loaded'),
            inview        = false;

            inview = elementOffset.top < viewportOffset.top + viewportSize.height*(1 + preLoadFactor) &&
            elementOffset.left + elementSize.width > viewportOffset.left &&
            elementOffset.left < viewportOffset.left + viewportSize.width;
                         
            //            console.log(i + ": loaded " + loaded + ", inview=" + inview);                                                    
            //            console.log(elementOffset);
            //            console.log(elementOffset);
            //            console.log(viewportSize);    
            //            console.log(viewportOffset);                
            allLoaded = allLoaded && loaded;
            if (!loaded && inview) {
                indexFillNote($element);                
            }
        }
    }
        
    $("div#notes").data('allLoaded',allLoaded);    
}
