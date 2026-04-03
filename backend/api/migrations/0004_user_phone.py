from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_appointmentemailnotification_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, max_length=32),
        ),
    ]
