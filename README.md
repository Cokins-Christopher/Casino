# Casino Project

A full-stack online casino application with a Django backend and React frontend.

## Running the Application

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
# Install dependencies
pipenv install
pipenv shell

# Run the server
cd project
python manage.py migrate
python manage.py runserver
```

## Docker Setup

You can run the entire application stack using Docker:

```bash
# Create .env file from template
cp .env.template .env
# Edit .env with your configuration

# Build and run with Docker Compose
docker-compose up -d
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### CI Workflow (`.github/workflows/ci.yml`)

The CI pipeline runs on:
- Push to main branch
- Pull requests to main branch

It performs:
1. **Backend Tests**:
   - Sets up Python and PostgreSQL
   - Installs dependencies
   - Runs Django tests
   - Checks code formatting with Black
   - Runs Flake8 linting
   - Generates test coverage reports

2. **Frontend Tests**:
   - Sets up Node.js
   - Installs dependencies
   - Runs ESLint
   - Runs Jest tests with coverage

3. **Build**:
   - Builds the React frontend
   - Collects Django static files
   - Creates a preview environment for pull requests

### Deployment Workflow (`.github/workflows/deploy.yml`)

The deployment pipeline runs on push to main branch after CI passes and:
1. Builds the frontend
2. Collects static files
3. Deploys to AWS Elastic Beanstalk
4. Runs database migrations
5. Notifies on Slack when deployment completes
6. Verifies the deployment

## Troubleshooting CI/CD Issues

### Common Problems and Solutions

1. **CI Tests Failing**:
   - Check test logs for specific error messages
   - Ensure all tests pass locally before pushing
   - Verify you have proper test data and test environment variables

2. **Deployment Failures**:
   - Check if secrets are properly configured in GitHub repository settings
   - Verify AWS credentials have proper permissions
   - Check Elastic Beanstalk environment health
   - Review logs in AWS CloudWatch

3. **Database Migration Errors**:
   - Always test migrations locally before deploying
   - Consider using a migration test environment
   - For critical migrations, backup the production database first

4. **Environment Variables**:
   - Ensure all required environment variables are set in GitHub secrets
   - Double-check secret names match those used in workflow files

5. **Docker Image Build Failures**:
   - Test Docker builds locally with `docker build`
   - Optimize Docker images for faster builds
   - Use Docker layer caching when possible

## Staging Environment

Pull requests automatically create a staging environment where the application can be previewed:
1. PR is submitted
2. CI tests run
3. A dynamic preview environment is deployed
4. Reviewers can test changes before approving

## Monitoring and Alerts

GitHub Actions sends notifications to Slack for:
- Failed builds
- Successful deployments
- Critical errors

For more information, contact the project maintainers.
