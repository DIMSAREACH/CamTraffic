# Generated migration for InstallmentPlan and InstallmentPayment models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('fines', '0006_cambodia_government_enforcement'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstallmentPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('num_installments', models.IntegerField()),
                ('installment_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('final_installment_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('interest_rate', models.DecimalField(decimal_places=2, default=0.00, max_digits=5)),
                ('setup_fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('payment_day_of_month', models.IntegerField(default=1)),
                ('status', models.CharField(
                    choices=[
                        ('active', 'Active'),
                        ('completed', 'Completed'),
                        ('defaulted', 'Defaulted'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='active',
                    max_length=20
                )),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('defaulted_at', models.DateTimeField(blank=True, null=True)),
                ('paid_amount', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('remaining_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('fine', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='installment_plan', to='fines.fine')),
            ],
            options={
                'db_table': 'installment_plans',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='InstallmentPayment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('installment_number', models.IntegerField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('due_date', models.DateField()),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('paid', 'Paid'),
                        ('overdue', 'Overdue'),
                        ('skipped', 'Skipped'),
                    ],
                    default='pending',
                    max_length=20
                )),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('paid_amount', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('payment_method', models.CharField(blank=True, max_length=50)),
                ('payment_reference', models.CharField(blank=True, max_length=255)),
                ('late_fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('days_overdue', models.IntegerField(default=0)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='fines.installmentplan')),
            ],
            options={
                'db_table': 'installment_payments',
                'ordering': ['installment_number'],
            },
        ),
        migrations.AddIndex(
            model_name='installmentplan',
            index=models.Index(fields=['fine', 'status'], name='idx_installment_fine_status'),
        ),
        migrations.AddIndex(
            model_name='installmentplan',
            index=models.Index(fields=['status', 'end_date'], name='idx_installment_status_end'),
        ),
        migrations.AddIndex(
            model_name='installmentpayment',
            index=models.Index(fields=['plan', 'installment_number'], name='idx_installment_plan_num'),
        ),
        migrations.AddIndex(
            model_name='installmentpayment',
            index=models.Index(fields=['status', 'due_date'], name='idx_installment_status_due'),
        ),
        migrations.AlterUniqueTogether(
            name='installmentpayment',
            unique_together={('plan', 'installment_number')},
        ),
    ]
