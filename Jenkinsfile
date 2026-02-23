pipeline {
    agent {
        docker {
            image 'node:20'   // 有 node + npm 的官方鏡像
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        IMAGE_NAME     = "stock-data-analysis-frontend"
        CONTAINER_NAME = "stock-data-analysis-frontend"
        APP_PORT       = "80"  // 容器內服務的 port，依你的 Dockerfile 調整
        HOST_PORT      = "3000"  // 宿主機對外 port
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Build') {
            steps {
                sh '''
                  cd "$WORKSPACE"
                  npm ci
                  npm run build
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'cd "$WORKSPACE" && docker build -t ${IMAGE_NAME}:latest .'
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
