from django.contrib import admin

from .models import AddOn, Appointment, BlogPost, PortfolioItem, Service, Testimonial, User

admin.site.register(User)
admin.site.register(Service)
admin.site.register(AddOn)
admin.site.register(Appointment)
admin.site.register(PortfolioItem)
admin.site.register(BlogPost)
admin.site.register(Testimonial)
