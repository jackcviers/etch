(function() {
    var models = window.etch.models,
        views = window.etch.views,
        collections = window.etch.collections;
        
    models.ImageUploader = Backbone.Model.extend({
        defaults: {
            index: 0,
            slug: jsonVars.page_slug,
            terms: jsonVars.page_slug
        }
    });
    
    views.ImageUploader = Backbone.View.extend({
        initialize: function(options) {
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
            $(this.el).remove();
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
            $(this.el).html(this.template(this.model.toJSON()));
            this.applyUploadForm();
            return this;
        }
        
    });

    models.ImageCropper = Backbone.Model.extend({
        url: function() {
            return '/api/image/'+ this.get('relative_path') +'/'+ this.get('filename') +'/';
        }
    });
    
    views.ImageCropper = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this, 'showPreview', 'changePreviewSize', 'updateCoords');
            this.model.bind('change:previewSize', this.changePreviewSize);
        },
        
        className: 'section image-cropper',
        
        template: _.template($('.image-crop-template').html()),

        events: {
            'click .aspect-banner': 'aspectBanner',
            'click .aspect-square': 'aspectSquare',
            'click .aspect-portrait': 'aspectPortrait',
            'click .aspect-landscape': 'aspectLandscape',
            'click .apply-crop': 'applyCrop',
            'click a.section-delete': 'closeWindow'
        },

        closeWindow: function(e) {
            e.preventDefault();
            this.remove();
        },

        setAspect: function(options) {
            var cropApi = this.model.get('cropApi');
            cropApi.setOptions({
                aspectRatio: options.aspectRatio
            });

            this.$('.crop-size-wrapper').resizable('option', 'aspectRatio', options.aspectRatio);
            
            this.model.set({'previewSize': options.previewSize});
            this.showPreview(this.model.get('coords'));
        },
        
        aspectBanner: function(e) {
            e.preventDefault();
            this.setAspect({aspectRatio: 4/1, previewSize: {x: 559, y: 140}});
        },
        
        aspectSquare: function(e) {
            e.preventDefault();
            this.setAspect({aspectRatio: 1, previewSize: {x: 132, y: 132}});
        },
        
        aspectPortrait: function(e) {
            e.preventDefault();
            this.setAspect({aspectRatio: 3/4, previewSize: {x: 130, y: 174}});
        },
        
        aspectLandscape: function(e) {
            e.preventDefault();
            this.setAspect({aspectRatio: 4/3, previewSize: {x: 176, y: 132}});
        },

        previewResize: function(newSize) {
        	var $img = this.$('.crop-preview');
            var previewSize = this.model.get('previewSize');
            var marginRatio = newSize.width / previewSize.x;
            var mLeft = parseInt($img.css('margin-left'));
            var mTop = parseInt($img.css('margin-top'));
            var ratio = this.model.get('cropSizeRatio');
            // $img.css({height: cropSize.height * ratio, width: cropSize.width * ratio, 'margin-left': mleft * ratio, 'margin-top': mtop * ratio});
            $img.css({height: newSize.height * ratio.y, width: newSize.width * ratio.x, 'margin-left': mLeft * marginRatio, 'margin-top': mTop * marginRatio});
            this.model.set({'previewSize': {x: newSize.width, y: newSize.height}});
        },
        
        applyCrop: function(e) {
            e.preventDefault();
            var view = this;
            var coords = this.model.get('coords');
            var previewSize = this.model.get('previewSize');
            var size = [previewSize.x, previewSize.y];

            var attrs = {
                image_requests: [{crop: [coords.x, coords.y, coords.x2, coords.y2], size: size}]
            };
            
            var options = {
                success: function(model, res) {
                    view.destroy();
                    var image = res.images.image
                    
                    // strip out url query strings now that the image has been edited
                    image.url = image.url +'?'+ new Date().valueOf();
                    image.url_local = image.url_local +'?'+ new Date().valueOf();
                    view.model._imageCallback(image);
                }
            };
            
            this.model.save(attrs, options);
        },
        
        updateCoords: function(coords) {
            var $cropPreviewImg = this.$('.crop-preview[src]');
            var $cropSizeWrapper = this.$('.crop-size-wrapper');
            var yRatio = $cropPreviewImg.height() / $cropSizeWrapper.height();
            var xRatio = $cropPreviewImg.width() / $cropSizeWrapper.width();

            this.model.set({coords: coords});
            this.model.set({'cropSizeRatio': {x: xRatio, y: yRatio}});
            this.model.set({'previewSize': {x: $cropSizeWrapper.width(), y: $cropSizeWrapper.height()}});
            
            this.showPreview(coords);
        },
        
        showPreview: function(coords) {
            var previewSize = this.model.get('previewSize');
            var xRatio = previewSize.x / coords.w;
            var yRatio = previewSize.y / coords.h;
            var imgWidth = this.model.get('rawImgSize').x;
            var imgHeight = this.model.get('rawImgSize').y;
            
            this.$('.crop-preview').css({
                width: Math.round(xRatio * imgWidth),
                height: Math.round(yRatio * imgHeight),
                marginLeft: '-' + Math.round(xRatio * coords.x)+ 'px',
                marginTop: '-' + Math.round(yRatio * coords.y)+ 'px'
            });
        },

        updateDimensions: function(size) {
            this.$('.crop-dimensions').text(parseInt(size.width) +'x'+ parseInt(size.height));
        },
        
        changePreviewSize: function() {
            var previewSize = this.model.get('previewSize');
            this.$('.crop-size-wrapper').css({height: previewSize.y, width: previewSize.x});
            this.updateDimensions({width: previewSize.x, height: previewSize.y});
        },
        
        render: function() {
            var view = this;
            $(this.el).html(this.template(this.model.toJSON()));
            var $rawImg = this.$('.raw-image');
            $rawImg.load(function() {
                var $previewWrapper = view.$('.crop-size-wrapper');
                $previewWrapper.resizable({
                    aspectRatio: 1,
                    maxWidth: 559,
                	stop: function(e, ui) {
                    	view.previewResize(ui.size);
                    },
                    resize: function(e, ui) {
                        view.updateDimensions(ui.size)
                    }
                });
                view.model.set({
                    rawImgSize: {x:$rawImg.outerWidth(), y:$rawImg.outerHeight()},
                    previewSize: {y: $previewWrapper.outerHeight(), x: $previewWrapper.outerWidth()}
                });


                // display the images size
                var height = $rawImg[0].naturalHeight
                var width = $rawImg[0].naturalWidth
                view.$('.natural-dimensions span').text(width +'x'+ height);
            });
            
            return this;
        },
        
        destroy: function() {
            $(this.el).remove();
        }
    });

    models.EditableImage = Backbone.Model;
        
    views.EditableImage = Backbone.View.extend({
        
        template: _.template('<img src="{{ url }}" />'),
        
        toolsTemplate: _.template($('.image-tools-template').html()),
        
        events: {
            'mouseover': 'showTools',
        },
        
        //  I wasn't sure if I wanted to break these tools off into its own model
        //  if it gets any more complicated then it probably should be seperated
        showTools: function(e) {
            var view = this;
            $el = $(this.el);
            this.$tools = $(this.renderTools().tools);
            $('body').append(this.$tools);
            this.$tools.css({
                top: $el.offset().top,
                left: $el.offset().left,
                height: $el.outerHeight(),
                width: $el.outerWidth()
            });
            
            this.$tools.bind('mouseleave', function() {
                view.removeTools();
            });
            
            this.$tools.find('.right').click(function(e) {
                e.preventDefault();
                var $el = $(view.el);
                $el.removeClass();
                $el.addClass('float-right');
                var editableModel = view.model.get('editableModel');
                view.removeTools();
            });
            
            this.$tools.find('.center').click(function(e) {
                e.preventDefault();
                var $el = $(view.el);
                $el.removeClass();
                $el.addClass('centered');
                view.removeTools();
            });
            
            this.$tools.find('.left').click(function(e) {
                e.preventDefault();
                var $el = $(view.el);
                $el.removeClass();
                $el.addClass('float-left');
                view.removeTools();
            });
            
            this.$tools.find('.delete').click(function(e) {
                e.preventDefault();
                $(view.el).remove();
                view.removeTools();
            });
            
            this.$tools.show('fade', 'fast')
        },
        
        removeTools: function(duration) {
            var view = this;
            view.$tools.hide('fade', 'fast', function() {
                view.$tools.remove();
            });
        },
        
        render: function() {
            this.el = $(this.template(this.model.toJSON()))[0];
            return this;
        },
        
        renderTools: function() {
            this.tools = this.toolsTemplate();
            return this
        }
    });
})();
