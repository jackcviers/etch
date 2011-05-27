(function() {
    var models = window.app.models,
        views = window.app.views,
        collections = window.app.collections;
        
    models.EditableImage = models.Model;
        
    views.EditableImage = views.View.extend({
        initialize: function() {
            views.View.prototype.initialize.apply(this, arguments);
        },
        
        template: _.template('<img src="{{ url }}" />'),
        
        toolsTemplate: _.template($('.image-tools-template').html()),
        
        events: {
            'mouseover': 'showTools',
        },
        
        //  I wasn't sure if I wanted to break these tools off into its own model
        //  if it gets any more complicated then it probably should be seperated
        showTools: function(e) {
            var view = this;
            this.$tools = $(this.renderTools().tools);
            $('body').append(this.$tools);
            this.$tools.css({
                top: this.$el.offset().top,
                left: this.$el.offset().left,
                height: this.$el.outerHeight(),
                width: this.$el.outerWidth()
            });
            
            this.$tools.bind('mouseleave', function() {
                view.removeTools();
            });
            
            this.$tools.find('.right').click(function(e) {
                e.preventDefault();
                view.$el.removeClass();
                view.$el.addClass('float-right');
                var editableModel = view.model.get('editableModel');
                view.removeTools();
            });
            
            this.$tools.find('.center').click(function(e) {
                e.preventDefault();
                view.$el.removeClass();
                view.$el.addClass('centered');
                view.removeTools();
            });
            
            this.$tools.find('.left').click(function(e) {
                e.preventDefault();
                view.$el.removeClass();
                view.$el.addClass('float-left');
                view.removeTools();
            });
            
            this.$tools.find('.delete').click(function(e) {
                e.preventDefault();
                view.$el.remove();
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