# backend/menu/models.py
from django.db import models

class Dishes(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    available = models.BooleanField(default=True)
    dishDay = models.BooleanField(default=False)
    category = models.CharField(max_length=50, choices=[
        ('almoco', 'Almoço'),
        ('porcoes', 'Porções'),
        ('bebidas', 'Bebidas')
    ])

    def __str__(self):
        return self.name


class DishSchedule(models.Model):
    date = models.DateField(unique=True)
    dish = models.ForeignKey(
        Dishes,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schedules',
    )
    is_open = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        if not self.is_open:
            return f"{self.date} - Fechado"
        if self.dish:
            return f"{self.date} - {self.dish.name}"
        return f"{self.date} - Aberto"