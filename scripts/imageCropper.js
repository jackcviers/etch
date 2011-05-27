(function() {
    var models = window.app.models,
        views = window.app.views,
        collections = window.app.collections,
        controllers = window.app.controllers;
        
    models.ImageCropper = models.Model.extend({
        url: function() {
            return '/api/image/'+ this.get('relative_path') +'/'+ this.get('filename') +'/';
        }
    });
    
    views.ImageCropper = views.View.extend({
        initialize: function(options) {
            views.View.prototype.initialize.apply(this, arguments);
            
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
            this.$el.remove();
        }
    });
})();
