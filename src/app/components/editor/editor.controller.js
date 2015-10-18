import FluxController from "../flux/flux.controller";
import KeyCode from "../shortcut/shortcut.config";
import ShortcutTask from "../shortcut/shortcut.task";

class EditorController extends FluxController {
    constructor ($window, $scope, Markdown, Dispatcher, FileUploader, Api) {
        'ngInject';
        
        super.constructor($scope,Dispatcher);
        this.api = Api;
        this.markdown = Markdown;
        this.uploader = FileUploader;
        this._scope.$watch("content", this.contentChangeCallback.bind(this));  

        this.preventBodyFromScroll();

        this.dragDrop = document.getElementsByClassName('text-field')[0];
        this.dragDrop.ondragleave = this.textareaOnDragLeave.bind(this);
        this.dragDrop.ondragover = this.textareaOnDragOver.bind(this);
        this.dragDrop.ondrop = this.droppingCallback.bind(this);

        this.fileupload = document.querySelector(".editor-fileupload");
        this.fileupload.onchange = this.fileUploadOnSelected.bind(this);
        this.textarea = document.querySelector("editor .editor-textarea");
        this.textarea.onblur = this.textareaOnBlur.bind(this);

        this.lastSelectionStart = 0;
        this.lastSelectionEnd = 0;
        this.showCoverFlag = false;

        // this._scope.$watch("selectedWorkbook", function(newVal) {
        //     console.log(newVal);
        // });
        // console.log(this._scope.selectedWorkbook);

        
        this._scope.$watch("ngIf", function(newVal, oldVal) {
            
        });

        var el_fo = document.getElementsByClassName("editor-ready-focus");
        if(el_fo.length > 0) {
            el_fo[0].focus();
        }

        this._shortcutTaskToken = ShortcutTask.setTask(this.keyupTask.bind(this));
    }

    onDestruct() {
        super.onDestruct();

        this.restoreScrollingBody();
    }

    restoreScrollingBody() {
        document.body.style.overflow = "auto";
    }

    preventBodyFromScroll() {
        document.body.style.overflow = "hidden";
    }

    textareaOnDragOver(e) {
        e.preventDefault();

        var self = this;
        clearTimeout(self.dragIntervalId);
        self.dragIntervalId = setTimeout(function() {
            self.showCoverFlag = false;
            self._scope.$apply();    
        }, 500);
        self.showCoverFlag = true;
        self._scope.$apply();
    }

    textareaOnBlur(e) {
        this.lastSelectionEnd = e.target.selectionEnd;
        this.lastSelectionStart = e.target.selectionStart;
    }

    fileUploadOnSelected(e) {
        var files = e.target.files;
        this.uploadFile(files);
    }

    uploadFile(files) {
        var self = this;

        var cb = function(success, data, status) {
            if(success) {
                var msg = "";
                for (var i = 0; i < data.length; i++) {
                    
                    msg += "![alt]("+self.api.host[self.api.env] + data[i].message.destination_path.substring(1) + data[i].message.filename+")\n";
                }
                
                self._scope.content = self.insertText(self.lastSelectionStart, self._scope.content, msg);
                
            }else {
                // failed to 
            }
        };

        var splitted = files[0].type.split("/");
        if(splitted.length > 0 && splitted[0] === 'image') {
            // image
            this.uploader.upload(this.api.image.upload.url, this.api.image.upload.method,[files[0]] , cb); 
        }else {
            // text
            if(typeof FileReader != "undefined"){
                var reader = new FileReader();
                reader.onload = function(evt) {
                    self._scope.content = self.insertText(self.lastSelectionStart,self._scope.content,"```\n"+evt.target.result+"\n```");
                    self._scope.$apply();
                };
                reader.readAsText(files[0]);
            }
        }
    }

    // return true to digest scope and prevent default action
    // if nothing is return, no scope will be digest and action will be default
    keyupTask(e) {
        
        var ctrlKey = (e.ctrlKey || e.metaKey);
        if(ctrlKey && e.keyCode === KeyCode.KEY_S) {
            this._scope.savedCallback();
            return true;
        }else if(e.keyCode === KeyCode.KEY_ESC) {
            this._scope.cancelCallback();
            return true;
        }

        if(ctrlKey && e.target.className.indexOf("editor-textarea") >= 0) {
            // editor textarea shortcut
            if(e.keyCode === KeyCode.KEY_B) {
                this.boldEvent();
                return true;
            }else if(e.keyCode === KeyCode.KEY_I) {
                this.italicEvent();
                return true;
            }else if(e.keyCode === KeyCode.KEY_L) {
                e.preventDefault();
                return true;
            }else if(e.keyCode === KeyCode.KEY_K) {
                this.codeEvent();
                return true;
            }
        }
    }

    contentChangeCallback() {
        if(this.markdownCompiling) {
           return; 
        }

        var self = this;
        self.markdownCompiling = true;
        self.markdownTimeoutId = setTimeout(function() {
            self.htmlContent = self.markdown.parseMd(self._scope.content);
            self.markdownCompiling = false;
            self._scope.$apply();
        }, 1000);
        
    }

    boldEvent() {
        var end = this.textarea.selectionEnd;
        var lastTop = this.textarea.scrollTop;

        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText) {
            return "**" + selectedText + "**";
        });
        
        this.restoreCursorPositionAndScrollTop(lastTop,end + 4);
    }

    italicEvent() {
        var end = this.textarea.selectionEnd;
        var lastTop = this.textarea.scrollTop;

        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText) {
            return "*" + selectedText + "*";
        });

        this.restoreCursorPositionAndScrollTop(lastTop,end + 2);
    }

    strikethroughEvent() {
        var end = this.textarea.selectionEnd;
        var lastTop = this.textarea.scrollTop;

        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText) {
            return "~~" + selectedText + "~~";
        });
        
        this.restoreCursorPositionAndScrollTop(lastTop, end + 4);
    }

    fileEvent() {
        if(this.fileupload) {
            this.fileupload.click();
        }   
    }

    anchorEvent() {
        var begin = this.textarea.selectionStart;
        var end = this.textarea.selectionEnd;
        var lastTop = this.textarea.scrollTop;
        var linkFlag = false;
        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText) {
            if(selectedText.match(/\[(.*?|TITLE)\]\((https?:\/\/(.*?)|LINK_HERE)\)/)) {
                return selectedText;
            }
            if(selectedText.match(/https?:\/\//)) {
                linkFlag = true;
                return "[TITLE]("+selectedText+")";
            }

            return "[" + selectedText + "](LINK_HERE)";
        });
        
        if(linkFlag) {
            this.restoreCursorPositionAndScrollTop(lastTop, begin + 1, begin + 6);       
        }else {
            this.restoreCursorPositionAndScrollTop(lastTop, end + 3, end + 12);
        }
        
    }

    headingEvent() {
        var self = this;
        var end = self.textarea.selectionEnd;
        var headingText = this.textarea.value;
        var lastTop = self.textarea.scrollTop;
        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText, start, end) {
            var lines = self.textarea.value.split("\n");
            var beginPosition = 0;
            for(var i = 0; i < lines.length; i ++) {
                if(beginPosition < start && start <= beginPosition + lines[i].length) {
                    headingText = headingText.substring(0,beginPosition) + "# " + headingText.substring(beginPosition, headingText.length);
                    return selectedText;
                }
                beginPosition += lines[i].length + 1;
            }
            return selectedText;
        });

        this._scope.content = headingText;
        this.restoreCursorPositionAndScrollTop(lastTop,end + 2);
    }

    codeEvent() {
        var self = this;
        var end = self.textarea.selectionEnd;
        var lines = self.textarea.value.split("\n");
        var lastTop = self.textarea.scrollTop;
        this._scope.content = this.replaceSelectedText(this.textarea, function(selectedText, start, end) {
            
            var beginPosition = 0;
            for(var i = 0; i < lines.length; i ++) {
                
                if(beginPosition <= start && start <= beginPosition + lines[i].length) {
                    lines[i] = "```\n" + lines[i];

                }

                if(beginPosition <= (end + 4) && (end + 4) <= beginPosition + lines[i].length) {
                    lines[i] = lines[i] + "\n```";
                }
                beginPosition += lines[i].length + 1;
            }
            return selectedText;
        });

        this._scope.content = lines.join("\n");
        this.restoreCursorPositionAndScrollTop(lastTop,end + 8);

    }

    restoreCursorPositionAndScrollTop(lastTop, beginPosition, endPosition ) {
        var self = this;
        setTimeout(function() {
            if(typeof endPosition === 'undefined') {
                self.setSelectionRange(self.textarea, beginPosition, beginPosition);    
            } else {
                self.setSelectionRange(self.textarea, beginPosition, endPosition);
            }
            self.textarea.scrollTop = lastTop;
        },30);
    }

    setSelectionRange(input, selectionStart, selectionEnd) {
        if(input.selectionStart) {
            input.focus();
            input.selectionStart = selectionStart;
            input.selectionEnd = selectionEnd;
        } else if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        } else if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
        }
    }

    insertText(start, text, textInsert) {
        return text.substring(0,start) + textInsert + text.substring(start, text.length);
    }

    replaceSelectedText(el,handler) {
        var readyBoldText = el.value;
        var selectedText = readyBoldText.substring(el.selectionStart, el.selectionEnd) ;
        var handlerText = handler(selectedText, el.selectionStart, el.selectionEnd) || selectedText;
        return readyBoldText.substring(0,el.selectionStart) + handlerText + readyBoldText.substring(el.selectionEnd, readyBoldText.length);
    }

    textareaOnDragLeave(e){
        e.preventDefault();
    }

    droppingCallback(e){
        e.preventDefault();
        this.showCoverFlag = false;
        var files = e.dataTransfer.files;
        this.uploadFile(files);

        this._scope.$apply();
    }


}   

export default EditorController;