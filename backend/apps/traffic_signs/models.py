from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class SignCategory(TimeStampedModel, ActiveModel):
    code = models.CharField(max_length=20, unique=True)
    name_en = models.CharField(max_length=100)
    name_km = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'traffic_signs_category'
        verbose_name_plural = 'sign categories'
        ordering = ['name_en']

    def __str__(self) -> str:
        return self.name_en


class TrafficSign(TimeStampedModel, ActiveModel):
    code = models.CharField(max_length=30, unique=True)
    name_en = models.CharField(max_length=150)
    name_km = models.CharField(max_length=150)
    category = models.ForeignKey(
        SignCategory,
        on_delete=models.PROTECT,
        related_name='signs',
    )
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='traffic_signs/', blank=True, null=True)
    fine_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    class Meta:
        db_table = 'traffic_signs_sign'
        ordering = ['code']

    def __str__(self) -> str:
        return f'{self.code} — {self.name_en}'
