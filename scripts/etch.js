(function() {
    var root = this,
        models = {},
        views = {},
        collections = {};

    
        
    $.fn.etchInstantiate = function(options, cb) {
        return this.each(function() {
            var $el = $(this);
            options || (options = {});

            settings = {
                el: this,
                attrs: {}
            }

            _.extend(settings, options);

            var model = new models[settings.classType](settings.attrs, settings);

            // initialize a view is there is one
            if (_.isFunction(views[settings.classType])) {
                var view = new views[settings.classType]({model: model, el: this, tagName: this.tagName});
            }
           
            // stash the model and view on the elements data object
            $el.data({model: model});
            $el.data({view: view});

            if (_.isFunction(cb)) {
                cb({model: model, view: view});
            }
        });
    }

    models.Editor = Backbone.Model.extend({
        // Named sets of buttons to be specified on the editable element
        // in the markup as "data-button-class"
        buttonClasses: {
            'default': ['save'],
            'all': ['bold', 'italic', 'underline', 'unordered-list', 'ordered-list', 'image', 'link', 'cite', 'save'],
            'title': ['bold', 'italic', 'underline', 'save'],
            'fact': ['bold', 'italic', 'underline', 'link', 'save'],
            'test': ['bold', 'image', 'save']
        }
    });

    views.Editor = Backbone.View.extend({
        initialize: function() {
            this.$el = $(this.el);
            
            // Model attribute event listeners:
            _.bindAll(this, 'changeButtons', 'changePosition', 'changeEditable', 'insertImage');
            this.model.bind('change:buttons', this.changeButtons);
            this.model.bind('change:position', this.changePosition);
            this.model.bind('change:editable', this.changeEditable);

            // Init Routines:
            this.changeEditable();
        },

        events: {
            'click .bold': 'toggleBold',
            'click .italic': 'toggleItalic',
            'click .underline': 'toggleUnderline',
            'click .heading': 'toggleHeading',
            'click .unordered-list': 'toggleUnorderedList',
            'click .justify-left': 'justifyLeft',
            'click .justify-center': 'justifyCenter',
            'click .justify-right': 'justifyRight',
            'click .ordered-list': 'toggleOrderedList',
            'click .link': 'toggleLink',
            'click .image': 'getImage',
            'click .save': 'save',
            'click .cite': 'addCitation'
        },
        
        changeEditable: function() {
            this.setButtonClass();
            this.preventWrapperDelete();
        },

        preventWrapperDelete: function() {
            // check to see if the user is about to delete the p wrapper 
            // out of the contenteditable prevent default if they do.
            var $editable = this.model.get('editable');
            var callback = function(e) {
                var range = window.getSelection().getRangeAt(0);
                if (e.keyCode === $.ui.keyCode.BACKSPACE) {
                    if (range.collapsed && inOnlyChildChain(range.commonAncestorContainer, $editable[0]) && range.startOffset === 0) {
                        e.preventDefault();
                    }
                }
            };
            $editable.unbind('keydown.keepWrap');
            $editable.bind('keydown.keepWrap', callback);
        },

        setButtonClass: function() {
            var editorModel = this.model;
            var buttonClass = editorModel.get('editable').attr('data-button-class') || 'default';
            editorModel.set({ buttons: editorModel.buttonClasses[buttonClass] });
        },

        changeButtons: function() {
            this.$el.empty();
            var view = this;
            var buttons = this.model.get('buttons');
            
            // hide editor panel if there are no buttons in it and exit early
            if (!buttons.length) { $(this.el).hide(); return; }
            
            _.each(this.model.get('buttons'), function(button){
                var $buttonEl = $('<a href="#" class="editor-button '+ button +'" title="'+ button.replace('-', ' ') +'"><span></span></a>');
                view.$el.append($buttonEl);
            });
            
            $(this.el).show('fade', 'fast');
        },

        changePosition: function() {
            var pos = this.model.get('position');
            this.$el.animate({'top': pos.y, 'left': pos.x}, { queue: false });
        },
        
        wrapSelection: function(selectionOrRange, elString, cb) {
            var range = selectionOrRange === Range ? selectionOrRange : selectionOrRange.getRangeAt(0);
            var el = document.createElement(elString);
            range.surroundContents(el);
        },
        
        addCitation: function(e) {
            e.preventDefault();
            var href = (prompt('Enter the citation url') || '').trim();
            if (!href) {
                return false;
            }
            var cursor = window.getSelection().getRangeAt(0);
            var node = $('<a></a>').addClass('citation').attr({'href': href, 'title': href}).text('c')[0];
            cursor.collapse();
            cursor.insertNode(node);
        },

        toggleBold: function(e) {
            e.preventDefault();
            document.execCommand('bold', false, null);
        },

        toggleItalic: function(e) {
            e.preventDefault();
            document.execCommand('italic', false, null);
        },

        toggleUnderline: function(e) {
            e.preventDefault();
            document.execCommand('underline', false, null);
        },
        
        toggleHeading: function(e) {
            e.preventDefault();
            var range = window.getSelection().getRangeAt(0);
            var wrapper = range.commonAncestorContainer.parentElement
            if ($(wrapper).is('h3')) {
                $(wrapper).replaceWith(wrapper.textContent)
                return;
            }
            var h3 = document.createElement('h3');
            range.surroundContents(h3);
        },

        toggleLink: function(e) {
            e.preventDefault();
            var range = window.getSelection().getRangeAt(0);

            // are we in an anchor element?
            if (range.startContainer.parentNode.tagName === 'A' || range.endContainer.parentNode.tagName === 'A') {
                document.execCommand('unlink', false, null);
            } else {
                var url = prompt('Enter a url');
                document.execCommand('createLink', false, url);
            }
        },

        toggleUnorderedList: function(e) {
            e.preventDefault();
            document.execCommand('insertUnorderedList', false, null);
        },

        toggleOrderedList: function(e){
            e.preventDefault();
            document.execCommand('insertOrderedList', false, null);
        },
        
        justifyLeft: function(e) {
            e.preventDefault();
            document.execCommand('justifyLeft', false, null);
        },

        justifyCenter: function(e) {
            e.preventDefault();
            document.execCommand('justifyCenter', false, null);
        },

        justifyRight: function(e) {
            e.preventDefault();
            document.execCommand('justifyRight', false, null);
        },

        getImage: function(e) {
            e.preventDefault();
            this.startUploader(this.insertImage);
        },
        
        startUploader: function(cb) {
            // initialize Image Uploader
            var model = new models.ImageUploader();
            var view = new views.ImageUploader({model: model});

            model._imageCallback = function(image) {
                view.startCropper(image, cb);
            };

            this._savedRange = window.getSelection().getRangeAt(0);
            $('body').append(view.render().el);
        },
        
        // passed as a callback to startUploader
        insertImage: function(image) {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this._savedRange);
            
            var attrs = {
                'editable': this.model.get('editable'),
                'editableModel': this.model.get('editableModel')
            };
            
            _.extend(attrs, image);

            var model = new models.EditableImage(attrs);
            var view = new views.EditableImage({model: model});
            this._savedRange.insertNode($(view.render().el).addClass('float-left')[0]);
        },
        
        save: function(e) {
            e.preventDefault();
            var editableModel = this.model.get('editableModel');
            editableModel.trigger('save');
        }
    });

    var etch =  {
        models: models,
        views: views,
        collections: collections,

        // This function is to be used as callback to whatever event
        // you use to initialize editing 
        editableInit: function(e) {
            e.stopPropagation();
            var $editable = $(e.srcElement).findEditable();
            $editable.attr('contenteditable', true);

            // if the editor isn't already built, build it
            var $editor = $('.editor-panel');
            if (!$editor.size()) {
                $editor = $('<div class="editor-panel">');
                var editorAttrs = { editable: $editable, editableModel: this.model };
                document.body.appendChild($editor[0]);
                $editor.etchInstantiate({classType: 'Editor', attrs: editorAttrs});
                editorModel = $editor.data('model');

            // check if we are on a new editable
            } else if ($editable[0] !== editorModel.get('editable')[0]) {
                // set new editable
                editorModel.set({
                    editable: $editable,
                    editableModel: this.model
                });
            }

            if (models.EditableImage) {
                // instantiate any images that may be in the editable
                var imgs = $editable.find('img');
                if (imgs.size()) {
                    var attrs = { editable: $editable, editableModel: this.model };
                    imgs.each(function() {
                        $(this).etchInstantiate({classType: 'EditableImage', attrs: attrs});
                    });
                }
            }

            // listen for mousedowns that are not coming from the editor
            // and close the editor
            $('body').bind('mousedown.editor', function(e) {
                if ($(e.srcElement).not('.editor-panel, .editor-panel *, .image-tools, .image-tools *').size()) {
                    $editor.remove();
                    // unblind the image-tools if the editor isn't active
                    $editable.find('img').unbind('mouseover');
                    // once the editor is removed, remove the body binding for it
                    $(this).unbind('mousedown.editor');
                }
            });

            editorModel.set({position: {x: e.pageX - 15, y: e.pageY - 80}});
        }
    };

    
    window.etch = etch;
})();
