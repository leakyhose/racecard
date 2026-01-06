pipeline {
    agent any
    
    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
        GEMINI_API_KEY = credentials('GEMINI_API_KEY')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Pulling latest code...'
                checkout scm
            }
        }
        
        stage('Prepare Environment') {
            steps {
                sh '''
                    cd /var/lib/jenkins/workspace/RaceCard-Backend
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" > .env
                    echo "PORT=4000" >> .env
                '''
            }
        }
        
        stage('Stop Old Containers') {
            steps {
                script {
                    sh '''
                        cd /var/lib/jenkins/workspace/RaceCard-Backend
                        docker-compose -f ${COMPOSE_FILE} down || true
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building Docker images...'
                sh '''
                    cd /var/lib/jenkins/workspace/RaceCard-Backend
                    docker-compose -f ${COMPOSE_FILE} build
                '''
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Starting containers...'
                sh '''
                    cd /var/lib/jenkins/workspace/RaceCard-Backend
                    docker-compose -f ${COMPOSE_FILE} up -d
                '''
            }
        }
        
        stage('Verify') {
            steps {
                echo 'Verifying deployment...'
                sh '''
                    sleep 10
                    curl -f https://api.racecard.io/status || exit 1
                '''
            }
        }
    }
    
    post {
        success {
            echo '✅ Deployment successful!'
        }
        failure {
            echo '❌ Deployment failed!'
        }
    }
}
