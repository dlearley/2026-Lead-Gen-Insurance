from locust import HttpUser, task, between

class LeadGenUser(HttpUser):
    wait_time = between(5, 15)

    @task
    def create_lead(self):
        self.client.post("/api/v1/leads", json={
            "firstName": "Locust",
            "lastName": "User",
            "email": "locust@example.com",
            "insuranceType": "AUTO"
        })

    @task(3)
    def view_leads(self):
        self.client.get("/api/v1/leads")
