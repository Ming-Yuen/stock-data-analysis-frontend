pipeline {
    agent any

    environment {
        IMAGE_NAME     = "stock-data-analysis-frontend"
        CONTAINER_NAME = "stock-data-analysis-frontend"
        HOST_PORT      = "3000"  // 對外訪問用埠
        APP_PORT       = "80"    // 容器內 Nginx 埠
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Deploy Container') {
            steps {
                sh """
                  if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
                    docker rm -f ${CONTAINER_NAME}
                  elif [ \$(docker ps -aq -f name=${CONTAINER_NAME}) ]; then
                    docker rm ${CONTAINER_NAME}
                  fi

                  docker run -d --name ${CONTAINER_NAME} \\
                    -p ${HOST_PORT}:${APP_PORT} \\
                    ${IMAGE_NAME}:latest
                """
            }
        }
    }
}
