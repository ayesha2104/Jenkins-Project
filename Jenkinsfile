pipeline {
    agent any

    // Pin the Node version in the job rather than relying on whatever is
    // installed on the build host. Configured under Manage Jenkins > Tools.
    tools {
        nodejs 'node20'
    }

    environment {
        AWS_REGION     = 'ap-south-1'
        AWS_ACCOUNT_ID = '875180007645'
        ECR_REPO       = 'react-vite-app'
        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_NAME     = "${ECR_REGISTRY}/${ECR_REPO}"
        CLUSTER_NAME   = 'react-jenkins-cluster'
        K8S_NAMESPACE  = 'react-app'
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {

        stage('Checkout Source Code') {
            steps {
                checkout scm
                script {
                    // Every build gets a unique, traceable tag: build number
                    // plus the exact commit it was built from.
                    env.GIT_SHA   = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHA}"
                }
                echo "Building image tag: ${env.IMAGE_TAG}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'node --version && npm --version'
                sh 'npm install'
            }
        }

        stage('Build React Application') {
            steps {
                sh 'npm run build'
                sh 'ls -lh dist'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build \
                      --build-arg BUILD_NUMBER=${env.BUILD_NUMBER} \
                      --build-arg GIT_COMMIT=${env.GIT_SHA} \
                      -t ${IMAGE_NAME}:${env.IMAGE_TAG} \
                      -t ${IMAGE_NAME}:latest \
                      .
                """
                sh "docker images ${IMAGE_NAME} --format '{{.Repository}}:{{.Tag}}  {{.Size}}'"
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-credentials',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} \
                          | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        docker push ${IMAGE_NAME}:${env.IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Update Kubernetes Deployment') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-credentials',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}

                        # k8s/namespace.yaml is applied once during cluster setup by an
                        # admin. The pipeline's EKS access entry is scoped to the
                        # react-app namespace, so it deliberately cannot create one.

                        # Substitute the freshly built tag into the manifest.
                        sed 's|IMAGE_PLACEHOLDER|${IMAGE_NAME}:${env.IMAGE_TAG}|' \
                          k8s/deployment.yaml > k8s/deployment.rendered.yaml

                        kubectl apply -f k8s/deployment.rendered.yaml
                        kubectl apply -f k8s/service.yaml
                    """
                }
            }
        }

        stage('Verify Deployment Status') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-credentials',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        kubectl -n ${K8S_NAMESPACE} rollout status deployment/react-vite-app --timeout=180s
                        echo "--- pods ---"
                        kubectl -n ${K8S_NAMESPACE} get pods -o wide
                        echo "--- deployment ---"
                        kubectl -n ${K8S_NAMESPACE} get deployment react-vite-app
                        echo "--- service ---"
                        kubectl -n ${K8S_NAMESPACE} get svc react-vite-service
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Deployed ${IMAGE_NAME}:${env.IMAGE_TAG} to ${CLUSTER_NAME}"
        }
        failure {
            echo "Build ${env.BUILD_NUMBER} failed - see the stage log above."
        }
        always {
            // Stop the Jenkins host filling up with old image layers.
            sh 'docker image prune -f || true'
        }
    }
}
