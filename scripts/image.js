(function() {
    var models = window.etch.models,
        views = window.etch.views,
        collections = window.etch.collections;

    etch.defaultImageSearch = 'dogs';
    etch.previewResizable = true;

    etch.aspectPresets = {
        'landscape': {aspectRatio: 4/3, previewSize: {x: 176, y: 132}},
        'portrait': {aspectRatio: 3/4, previewSize: {x: 130, y: 174}},
        'square': {aspectRatio: 1, previewSize: {x: 132, y: 132}},
        'banner': {aspectRatio: 4/1, previewSize: {x: 559, y: 140}}
    };

    var imageUploaderTemplate = '\
        <a class="etch-section-delete" href="#"></a>\
        <div class="head">\
            <ul class="link-list etch-tabs">\
                <li class="current"><a href="#" data-pane="file-upload">Upload</a></li>\
                <li><a href="#" data-pane="web-search-upload">Web Search</a></li>\
                <li><a href="#" data-pane="url-upload">Url</a></li>\
            </ul>\
        </div>\
        <div class="body">\
            <div class="inner-pane file-upload">\
                <form action="/api/image/upload/" method="POST" enctype="multipart/form-data">\
                    <input name="image-file" type="file" />\
                </form>\
            </div>\
            <div class="inner-pane web-search-upload">\
                <input type="text" class="web-search-terms" placeholder="Search Terms" name="search_terms" value="{{ terms }}" />\
                <a href="#" class="web-search-submit etch-button" value="Search">Search</a>\
                <div class="arrows">\
                    <a class="arrow prev left-arrow" href="#"></a>\
                    <a class="arrow next right-arrow" href="#"></a>\
                </div>\
                <div class="gallery">\
                </div>\
            </div>\
            <div class="inner-pane url-upload">\
                <input type="text" placeholder="Image Url" class="image-url" name="image_url" />\
                <a href="#" class="etch-button url-upload-submit">Submit</a>\
            </div>\
        </div>\
    ';
 
    var imageCropTemplate = '\
        <a class="etch-section-delete" href="#"></a>\
        <div class="crop-section">\
            <div class="natural-dimensions">Original Size: <span></span></div>\
            <div class="raw-image-wrapper inner-pane">\
                <img class="raw-image" src="{{ url }}" />\
            </div>\
        </div>\
        <div class="preview-section">\
            <ul class="link-list etch-tabs aspect-links">\
                {% _.each(etch.aspectPresets, function(value, key) { %}\
                    <li><a href="#" class="aspect-preset" data-aspect="{{ key }}">{{ key }}</a></li>\
                {% }); %}\
                <!--\
                <li><a href="#" class="aspect-square">Square</a></li>\
                <li><a href="#" class="aspect-portrait">Portrait</a></li>\
                <li><a href="#" class="aspect-landscape">Landscape</a></li>\
                -->\
                <li><a href="#" class="etch-button apply-crop">Crop</a></li>\
            </ul>\
            <div class="crop-preview-wrapper">\
                <div class="crop-size-wrapper">\
                    <div class="crop-dimensions"></div>\
                    <img class="crop-preview" src="{{ url }}"/>\
                </div>\
                <p>\
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. \
                    Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. \
                    Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur. \
                    Donec ut libero sed arcu vehicula ultricies a non tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. \
                    Aenean ut gravida lorem. Ut turpis felis, pulvinar a semper sed, adipiscing id dolor. Pellentesque auctor nisi id magna consequat\
                    sagittis. Curabitur dapibus enim sit amet elit pharetra tincidunt feugiat nisl imperdiet. Ut convallis libero in urna ultrices \
                    accumsan. Donec sed odio eros. Donec viverra mi quis quam pulvinar at malesuada arcu rhoncus. Cum sociis natoque penatibus et \
                    magnis dis parturient montes, nascetur ridiculus mus. In rutrum accumsan ultricies. Mauris vitae nisi at sem facilisis semper \
                    ac in est.\
                </p>\
                <p>\
                    Curabitur dapibus enim sit amet elit pharetra tincidunt feugiat nisl imperdiet. Ut convallis libero in urna ultrices \
                    accumsan. Donec sed odio eros. Donec viverra mi quis quam pulvinar at malesuada arcu rhoncus. Cum sociis natoque penatibus et \
                    magnis dis parturient montes, nascetur ridiculus mus. In rutrum accumsan ultricies. Mauris vitae nisi at sem facilisis semper \
                    ac in est.  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. \
                    Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. \
                    Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur. \
                    Donec ut libero sed arcu vehicula ultricies a non tortor.\
                </p>\
            </div>\
        </div>\
    ';

    var imageToolsTemplate = '\
        <div class="image-tools">\
            <div class="etch-buttons">\
                <a class="editor-button left" title="Left" href="#"><span></span></a>\
                <a class="editor-button center" title="Center" href="#"><span></span></a>\
                <a class="editor-button right" title="Right" href="#"><span></span></a>\
                <a class="editor-button delete" title="Delete" href="#"><span></span></a>\
            </div>\
        </div>\
    ';
        
    models.ImageUploader = Backbone.Model.extend({
        defaults: {
            index: 0,
            terms: etch.defaultImageSearch
        }
    });
    
    views.ImageUploader = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this, 'startCropper', 'uploadCallback', 'imageSearch');
            this.model.bind('change:index', this.imageSearch);
            this.model.bind('change:terms', this.imageSearch);
        },
        
        className: 'etch-section image-uploader',
        
        template: _.template(imageUploaderTemplate),
        
        events: {
            'click .etch-tabs a': 'switchTab',
            'click .url-upload-submit': 'urlSubmit',
            'click .etch-section-delete': 'closeWindow',
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
                    $('body').etchNotify({type: 'error', message: data.responseText, timeOut: 5000});
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
            var difference = $(e.target).hasClass('prev') ? -1 : 1;
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
            var url = $(e.target).closest('a').attr('href');
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
    

            var aspects = []
            _.each(etch.aspectPresets, function(value, key) {
               aspects.push(etch.aspectPresets[key]);
            });

            var defaultAspect = aspects[0]

            // wait for the image to load and then
            // initialize Jcrop.  otherwise the image will have size 0 0.
            view.$('.raw-image').load(function() {
                var cropApi = $.Jcrop('.image-cropper .raw-image', {
                    boxHeight: 400,
                    boxWidth: 400,
                    onChange: view.updateCoords,
                    onSelect: view.updateCoords
                });

                cropApi.setSelect([0, 0, defaultAspect.previewSize.x, defaultAspect.previewSize.y]);
                cropApi.setOptions({aspectRatio: defaultAspect.aspectRatio});
                view.model.set({'previewSize': defaultAspect.previewSize});
                view.model.set({cropApi: cropApi});

                // TODO: hacky.  triggering a click to make the image preview reset itself to the first preset
                // fix this later when I have time to refactor this code
                $('.aspect-links li a').first().click();
                // view.updateCoords({x: 0, y: 0, w: defaultAspect.previewSize.x, h: defaultAspect.previewSize.y});

                view.model._imageCallback = cb;
            });
        },
        
        switchTab: function(e) {
            e.preventDefault();
            $anchor = $(e.target);
            $tab = $anchor.parent('li');
            $tabs = $tab.add($tab.siblings());
            $tabs.removeClass('current');
            $tab.addClass('current');
            var paneClass = $anchor.attr('data-pane');
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
        
        className: 'etch-section image-cropper',
        
        template: _.template(imageCropTemplate),

        events: {
            // 'click .aspect-banner': 'aspectBanner',
            // 'click .aspect-square': 'aspectSquare',
            // 'click .aspect-portrait': 'aspectPortrait',
            // 'click .aspect-landscape': 'aspectLandscape',
            'click .aspect-preset': 'setAspect',
            'click .apply-crop': 'applyCrop',
            'click a.etch-section-delete': 'closeWindow'
        },

        closeWindow: function(e) {
            e.preventDefault();
            this.remove();
        },

        setAspect: function(e) {
            e && e.preventDefault();
            var preset = etch.aspectPresets[$(e.target).attr('data-aspect')];
            
            var cropApi = this.model.get('cropApi');
            cropApi.setOptions({
                aspectRatio: preset.aspectRatio
            });

            this.$('.crop-size-wrapper').resizable('option', 'aspectRatio', preset.aspectRatio);
            
            this.model.set({'previewSize': preset.previewSize});
            this.showPreview(this.model.get('coords'));
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
            var size = [Math.floor(previewSize.x), Math.floor(previewSize.y)];

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

                // controls whether the preview image can be resized
                if (etch.previewResizable) {
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
                }
                
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
        
        toolsTemplate: _.template(imageToolsTemplate),
        
        events: {
            'mouseenter': 'showTools'
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

    $.fn.etchNotify = function(options){
        var settings = {
            type: 'alert',   // type should equal 'error', 'alert', 'loading', or 'success'
            message: '',
            timeOut: null,   // time to display, in ms
            effect: 'blind' // effect for jQuery show() method
        }

        $.extend(settings, options);

        return this.each(function(){
            var $notify = $(this).find('.notify').first();

            clearTimeout($notify.data('notifyTimeoutId'));
            $notify.stop(true, true);
            $notify.removeClass('error loading alert success');
            $notify.html(settings.message).addClass(settings.type);

            //for some reason, using :hidden or :visible doesn't work here.
            //we have to directly look at the css display property
            if ($notify.is(':hidden')) {
                $notify.show(settings.effect);
            }

            if (settings.timeOut) {
                $notify.data('notifyTimeoutId', setTimeout(function() { $notify.hide(settings.effect); }, settings.timeOut));
            }
        });
    }


})();
