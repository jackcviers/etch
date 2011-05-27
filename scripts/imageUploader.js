(function() {
    var models = window.app.models,
        views = window.app.views,
        collections = window.app.collections,
        controllers = window.app.controllers;
        
    models.ImageUploader = models.Model.extend({
        defaults: {
            index: 0,
            slug: jsonVars.page_slug,
            terms: jsonVars.page_slug
        }
    });
    
    views.ImageUploader = views.View.extend({
        initialize: function(options) {
            views.View.prototype.initialize.apply(this, arguments);
            
            _.bindAll(this, 'startCropper', 'uploadCallback', 'imageSearch');
            this.model.bind('change:index', this.imageSearch);
            this.model.bind('change:terms', this.imageSearch);
        },
        
        className: 'section image-uploader',
        
        template: _.template($('.image-uploader-template').html()),
        
        events: {
            'click .tabs a': 'switchTab',
            'click .url-upload-submit': 'urlSubmit',
            'click .section-delete': 'closeWindow',
            'click .web-search-submit': 'webSearch',
            'click .arrow': 'navigateImages',
            'click .gallery img': 'gallerySubmit',
            'keypress .web-search-terms': 'termsKeypress',
            'change .file-upload [name="image-file"]': 'uploadSubmit'
        },

        closeWindow: function(e) {
            e.preventDefault();
            this.remove(); 
        },

        applyUploadForm: function() {
            // use jquery.form.ajaxForm to handle async file upload
            this.$('.file-upload form').ajaxForm({
                iframe: true,
                success: this.uploadCallback
            });
        },
        
        uploadSubmit: function(e) {
            e.preventDefault();
            this.$('.file-upload form').submit();
        },
        
        imageSearch: function(options) {
            var view = this;
            var settings = {
                provider: 'flickr',
                search_terms: this.model.get('terms'),
                result_index: this.model.get('index'),
                layout_position: 'main_column',
                row_count: 2,
                cc_filter: 1,
                success: function(data) {
                    view.$('.gallery').html($(data.pane));
                },
                error: function(data) {
                    $('body').notify({type: 'error', message: data.responseText, timeOut: 5000});
                }
            }
            
            $.extend(settings, options);
            
            var data = [
                {name: 'provider', value: settings.provider},
                {name: 'search_terms', value: settings.search_terms},
                {name: 'result_index', value: settings.result_index},
                {name: 'layout_position', value: settings.layout_position},
                {name: 'row_count', value: settings.row_count},
                {name: 'cc_filter', value: settings.cc_filter}
            ];
            
            $.ajax({
                type: 'GET',
                url: '/api/mpages/elements/image/search/',
                data: data,
                success: settings.success,
                error: settings.error
            });            
        },
        
        navigateImages: function(e) {
            e.preventDefault();
            var difference = $(e.srcElement).hasClass('prev') ? -1 : 1;
            this.model.set({'index': this.model.get('index') + difference});
        },
        
        termsKeypress: function(e) {
            if (e.keyCode == $.ui.keyCode.ENTER) {
                this.webSearch(e);
            }
        },
        
        webSearch: function(e) {
            e.preventDefault();
            this.model.set({'terms': this.$('.web-search-terms').val(), 'index': 0});
        },

        urlSubmit: function(e) {
            e.preventDefault();
            var url = this.$('.url-upload .image-url').val()
            this.uploadImage(url);
        },
        
        gallerySubmit: function(e) {
            e.preventDefault();
            var url = $(e.srcElement).closest('a').attr('href');
            this.uploadImage(url)
        },
                
        uploadImage: function(url, cb) {
            var callback = cb || this.uploadCallback;
            $.ajax({
                type: 'POST',
                url: '/api/image/upload/', 
                data: [{name: 'url', value: url}], 
                success: callback
            });            
        },
        
        uploadCallback: function(res) {
            var image = JSON.parse(res).images.image;
            this.model._imageCallback(image);
        },
        
        // this is called as a success callback from the upload form
        startCropper: function(image, cb) {
            var self = this;
            var image;
            
            // create attrs for new image cropper model
            var attrs = _.extend({}, image, {
                id: image.filename
            });

            var model = new models.ImageCropper(attrs);
            var view = new views.ImageCropper({model: model});
            this.$el.remove();
            $('body').append(view.render().el);
    
            // wait for the image to load and then
            // initialize Jcrop.  otherwise the image will have size 0 0.
            view.$('.raw-image').load(function() {
                var cropApi = $.Jcrop('.image-cropper .raw-image', {
                    boxHeight: 400,
                    boxWidth: 400,
                    onChange: view.updateCoords,
                    onSelect: view.updateCoords,
                });
                cropApi.setSelect([0,0,132,132]);
                cropApi.setOptions({aspectRatio: 1});
                view.model.set({'previewSize': {x: 132, y: 132}});
                view.model.set({cropApi: cropApi});
                view.model._imageCallback = cb;
            });
        },
        
        switchTab: function(e) {
            e.preventDefault();
            var paneClass = $(e.srcElement).attr('data-pane');
            this.$('.body .inner-pane').hide();
            this.$('.'+ paneClass).show();
            if (paneClass === 'web-search-upload' && !this.$('.gallery').children().size()) {
                this.imageSearch();
            }
        },
        
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.applyUploadForm();
            return this;
        }
        
    });
    
})();
