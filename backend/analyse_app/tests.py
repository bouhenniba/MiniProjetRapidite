from django.test import TestCase, Client
import json
from unittest.mock import MagicMock, patch

class OLAPAPITestCase(TestCase):
    def setUp(self):
        self.client = Client()
    
    @patch('analyse_app.views.pool')  # Mock the connection pool
    def test_all_dimensions(self, mock_pool):
        """Test: All dimensions ALL"""
        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_pool.acquire.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock fetchall return value
        # Empty result for this test or some dummy data
        mock_cursor.var.return_value.getvalue.return_value.description = [('NOMBRE_COMMANDES',), ('MOYENNE_RETARD',)]
        mock_cursor.var.return_value.getvalue.return_value.fetchall.return_value = []
        
        response = self.client.post('/analyse_app/api/analyse/',
            json.dumps({'temp': 'ALL', 'clie': 'ALL', 'emp': 'ALL', 'prod': 'ALL'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['metadata']['dimension_count'], 0)
    
    @patch('analyse_app.views.pool')
    def test_year_dimension(self, mock_pool):
        """Test: Time dimension - Year"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_pool.acquire.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock data with 'ANNEE' column
        mock_cursor.var.return_value.getvalue.return_value.description = [('ANNEE',), ('NOMBRE_COMMANDES',)]
        mock_cursor.var.return_value.getvalue.return_value.fetchall.return_value = [(2023, 100)]
        
        response = self.client.post('/analyse_app/api/analyse/',
            json.dumps({'temp': 'year', 'clie': 'ALL', 'emp': 'ALL', 'prod': 'ALL'}),
            content_type='application/json'
        )
        data = response.json()
        self.assertTrue(data['success'])
        self.assertGreater(len(data['data']), 0)
        self.assertIn('annee', data['data'][0])
        self.assertIn('nombre_commandes', data['data'][0])
