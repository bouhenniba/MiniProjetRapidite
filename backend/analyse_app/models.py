from django.db import models


class annee(models.Model):
    NUM_ANNEE = models.IntegerField(db_column='NUM_ANNEE', primary_key=True)
    DESIGNATION_ANNEE = models.CharField(
        max_length=100, db_column='DESIGNATION_ANNEE')
    NATURE_ANNEE = models.CharField(max_length=10, db_column='NATURE_ANNEE')

    class Meta:
        managed = False
        db_table = 'ANNEE'
