from django.db import models


class TrafficSign(models.Model):
    CATEGORY_CHOICES = [
        ('warning', 'Warning'),
        ('prohibitory', 'Prohibitory'),
        ('mandatory', 'Mandatory'),
        ('informative', 'Informative'),
    ]

    sign_name = models.CharField(max_length=150)
    sign_name_km = models.CharField(max_length=200, blank=True)
    sign_name_en = models.CharField(max_length=200, blank=True)
    sign_code = models.CharField(max_length=20, unique=True, blank=True)
    description = models.TextField()
    description_en = models.TextField(blank=True)
    guidance = models.TextField(blank=True, help_text='Traffic rule guidance for drivers')
    guidance_en = models.TextField(blank=True)
    image = models.ImageField(upload_to='signs/', blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='warning')
    penalty = models.CharField(max_length=255, blank=True)
    rules = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'traffic_signs'
        ordering = ['category', 'sign_name']

    def __str__(self):
        return self.sign_name
