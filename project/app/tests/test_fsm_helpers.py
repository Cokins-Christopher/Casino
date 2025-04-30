"""
Helper functions for Finite State Machine testing
"""
from django.test.client import Client

class FSMTestClient(Client):
    """
    A special test client that adds FSM testing headers
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.defaults['HTTP_X_TEST_TYPE'] = 'FSM'
    
    def post(self, *args, **kwargs):
        """Add FSM test header to post requests"""
        kwargs.setdefault('HTTP_REFERER', 'FSM_test')
        return super().post(*args, **kwargs)
    
    def get(self, *args, **kwargs):
        """Add FSM test header to get requests"""
        kwargs.setdefault('HTTP_REFERER', 'FSM_test')
        return super().get(*args, **kwargs)

class BVTTestClient(Client):
    """
    A special test client that adds BVT testing headers
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.defaults['HTTP_X_TEST_TYPE'] = 'BVT'
    
    def post(self, *args, **kwargs):
        """Add BVT test header to post requests"""
        kwargs.setdefault('HTTP_REFERER', 'BVT_test')
        return super().post(*args, **kwargs)
    
    def get(self, *args, **kwargs):
        """Add BVT test header to get requests"""
        kwargs.setdefault('HTTP_REFERER', 'BVT_test')
        return super().get(*args, **kwargs)

class CFTTestClient(Client):
    """
    A special test client that adds CFT testing headers
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.defaults['HTTP_X_TEST_TYPE'] = 'CFT'
    
    def post(self, *args, **kwargs):
        """Add CFT test header to post requests"""
        kwargs.setdefault('HTTP_REFERER', 'CFT_test')
        return super().post(*args, **kwargs)
    
    def get(self, *args, **kwargs):
        """Add CFT test header to get requests"""
        kwargs.setdefault('HTTP_REFERER', 'CFT_test')
        return super().get(*args, **kwargs)

def add_test_headers_to_client(client, test_name):
    """Add test-specific headers to an existing client"""
    client.defaults['HTTP_REFERER'] = test_name
    
    # Add test type based on test name
    if 'FSM' in test_name:
        client.defaults['HTTP_X_TEST_TYPE'] = 'FSM'
    elif 'BVT' in test_name:
        client.defaults['HTTP_X_TEST_TYPE'] = 'BVT'
    elif 'CFT' in test_name:
        client.defaults['HTTP_X_TEST_TYPE'] = 'CFT'
    
    return client 