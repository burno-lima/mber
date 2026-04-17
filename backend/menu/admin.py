from django.contrib import admin
from .models import Dishes, DishSchedule

@admin.register(Dishes)
class DishAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'dishDay', 'available')
    list_filter = ('dishDay', 'available')
    list_editable = ('price', 'dishDay', 'available')


@admin.register(DishSchedule)
class DishScheduleAdmin(admin.ModelAdmin):
    list_display = ('date', 'dish', 'is_open', 'note')
    list_filter = ('is_open',)
    search_fields = ('dish__name', 'note')