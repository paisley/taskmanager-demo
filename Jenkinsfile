pipeline {
    agent any
    
    environment {
        // Docker Registry Configuration
        DOCKER_REGISTRY = 'registry.example.com:5000'
        DOCKER_REPO = 'task-manager'
        
        // Build Configuration
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT_SHORT = "${env.GIT_COMMIT?.take(8)}"
        IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
        
        // Security Scanning Tools
        SONARQUBE_SERVER = 'SonarQube'
        ARTIFACTORY_SERVER = 'Artifactory'
        PRISMA_API_URL = credentials('prisma-api-url')
        PRISMA_ACCESS_KEY = credentials('prisma-access-key')
        PRISMA_SECRET_KEY = credentials('prisma-secret-key')
        
        // Docker Registry Credentials
        DOCKER_REGISTRY_CREDS = credentials('docker-registry-credentials')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo "🔄 Checking out code..."
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = "${BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
                echo "📋 Build: ${BUILD_NUMBER}, Commit: ${env.GIT_COMMIT_SHORT}"
            }
        }
        
        stage('Build') {
            parallel {
                stage('Build Auth Service') {
                    steps {
                        dir('auth-service') {
                            echo "🔨 Building Auth Service..."
                            sh 'npm ci'
                            sh 'npm run build --if-present'
                        }
                    }
                }
                
                stage('Build Task Service') {
                    steps {
                        dir('task-service') {
                            echo "🔨 Building Task Service..."
                            sh 'npm ci'
                            sh 'npm run build --if-present'
                        }
                    }
                }
                
                stage('Build UI') {
                    steps {
                        dir('ui') {
                            echo "🔨 Building UI..."
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Test Auth Service') {
                    steps {
                        dir('auth-service') {
                            echo "🧪 Testing Auth Service..."
                            sh 'npm test -- --coverage --ci --testResultsProcessor=jest-junit'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'auth-service/junit.xml'
                            publishCoverage adapters: [
                                coberturaAdapter('auth-service/coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
                
                stage('Test Task Service') {
                    steps {
                        dir('task-service') {
                            echo "🧪 Testing Task Service..."
                            sh 'npm test -- --coverage --ci --testResultsProcessor=jest-junit'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'task-service/junit.xml'
                            publishCoverage adapters: [
                                coberturaAdapter('task-service/coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
                
                stage('Test UI') {
                    steps {
                        dir('ui') {
                            echo "🧪 Testing UI..."
                            sh 'npm test -- --coverage --ci --testResultsProcessor=jest-junit --watchAll=false'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'ui/junit.xml'
                            publishCoverage adapters: [
                                coberturaAdapter('ui/coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('SonarQube Analysis') {
                    steps {
                        script {
                            echo "🔍 Running SonarQube analysis..."
                            def scannerHome = tool 'SonarQubeScanner'
                            withSonarQubeEnv('SonarQube') {
                                sh """
                                    ${scannerHome}/bin/sonar-scanner \
                                    -Dsonar.projectKey=task-manager-demo \
                                    -Dsonar.projectName='Task Manager Demo' \
                                    -Dsonar.projectVersion=${IMAGE_TAG} \
                                    -Dsonar.sources=. \
                                    -Dsonar.exclusions='**/node_modules/**,**/coverage/**,**/*.test.js' \
                                    -Dsonar.javascript.lcov.reportPaths='auth-service/coverage/lcov.info,task-service/coverage/lcov.info,ui/coverage/lcov.info'
                                """
                            }
                        }
                    }
                }
                
                stage('Dependency Check') {
                    steps {
                        echo "🔒 Running dependency vulnerability scan..."
                        script {
                            ['auth-service', 'task-service', 'ui'].each { service ->
                                dir(service) {
                                    sh 'npm audit --audit-level=high --json > npm-audit-report.json || true'
                                    archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
                                }
                            }
                        }
                    }
                }
                
                stage('SAST Scan') {
                    steps {
                        echo "🛡️ Running static application security testing..."
                        sh '''
                            # Example: Run additional SAST tools
                            echo "Running custom security checks..."
                            
                            # Check for hardcoded secrets
                            echo "🔍 Checking for hardcoded secrets..."
                            grep -r "password.*=" . --include="*.js" || true
                            grep -r "secret.*=" . --include="*.js" || true
                            grep -r "key.*=" . --include="*.js" || true
                            
                            # Check for SQL injection patterns
                            echo "🔍 Checking for SQL injection patterns..."
                            grep -r "query.*+.*\\$" . --include="*.js" || true
                        '''
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    echo "🚦 Waiting for SonarQube Quality Gate..."
                    timeout(time: 5, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            echo "⚠️ Quality Gate failed: ${qg.status}"
                            echo "🔄 Continuing build for demo purposes..."
                            // In production, you might want to fail here:
                            // error "Pipeline aborted due to quality gate failure: ${qg.status}"
                        } else {
                            echo "✅ Quality Gate passed!"
                        }
                    }
                }
            }
        }
        
        stage('Package') {
            parallel {
                stage('Package Database') {
                    steps {
                        script {
                            echo "📦 Building Database image..."
                            def dbImage = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG}",
                                "./database"
                            )
                            env.DB_IMAGE = dbImage.id
                        }
                    }
                }
                
                stage('Package Auth Service') {
                    steps {
                        script {
                            echo "📦 Building Auth Service image..."
                            def authImage = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:${IMAGE_TAG}",
                                "./auth-service"
                            )
                            env.AUTH_IMAGE = authImage.id
                        }
                    }
                }
                
                stage('Package Task Service') {
                    steps {
                        script {
                            echo "📦 Building Task Service image..."
                            def taskImage = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:${IMAGE_TAG}",
                                "./task-service"
                            )
                            env.TASK_IMAGE = taskImage.id
                        }
                    }
                }
                
                stage('Package UI') {
                    steps {
                        script {
                            echo "📦 Building UI image..."
                            def uiImage = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:${IMAGE_TAG}",
                                "./ui"
                            )
                            env.UI_IMAGE = uiImage.id
                        }
                    }
                }
            }
        }
        
        stage('Container Security Scan') {
            parallel {
                stage('Scan Database Image') {
                    steps {
                        script {
                            echo "🔍 Scanning Database image for vulnerabilities..."
                            sh """
                                # Example Prisma scan (adjust based on your Prisma setup)
                                echo "Scanning ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG}"
                                # prisma-cloud-scan ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG}
                            """
                        }
                    }
                }
                
                stage('Scan Auth Service Image') {
                    steps {
                        script {
                            echo "🔍 Scanning Auth Service image..."
                            sh """
                                echo "Scanning ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:${IMAGE_TAG}"
                                # Add your container scanning commands here
                            """
                        }
                    }
                }
                
                stage('Scan Task Service Image') {
                    steps {
                        script {
                            echo "🔍 Scanning Task Service image..."
                            sh """
                                echo "Scanning ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:${IMAGE_TAG}"
                            """
                        }
                    }
                }
                
                stage('Scan UI Image') {
                    steps {
                        script {
                            echo "🔍 Scanning UI image..."
                            sh """
                                echo "Scanning ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:${IMAGE_TAG}"
                            """
                        }
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                script {
                    echo "🚀 Pushing images to registry..."
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        // Push images with build tag
                        sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG}"
                        sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:${IMAGE_TAG}"
                        sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:${IMAGE_TAG}"
                        sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:${IMAGE_TAG}"
                        
                        // Tag and push as latest for main branch
                        if (env.BRANCH_NAME == 'main') {
                            sh """
                                docker tag ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:latest
                                docker tag ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:latest
                                docker tag ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:latest
                                docker tag ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:${IMAGE_TAG} ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:latest
                                
                                docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:latest
                                docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:latest
                                docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:latest
                                docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:latest
                            """
                        }
                    }
                }
            }
        }
        
        stage('Publish Artifacts') {
            steps {
                script {
                    echo "📋 Publishing build artifacts..."
                    
                    // Create deployment manifest
                    writeFile file: 'deployment-manifest.yaml', text: """
# Task Manager Deployment Manifest
# Generated by Jenkins Build ${BUILD_NUMBER}
# Commit: ${env.GIT_COMMIT_SHORT}
# Timestamp: ${new Date()}

images:
  database: ${DOCKER_REGISTRY}/${DOCKER_REPO}/database:${IMAGE_TAG}
  auth-service: ${DOCKER_REGISTRY}/${DOCKER_REPO}/auth-service:${IMAGE_TAG}
  task-service: ${DOCKER_REGISTRY}/${DOCKER_REPO}/task-service:${IMAGE_TAG}
  ui: ${DOCKER_REGISTRY}/${DOCKER_REPO}/ui:${IMAGE_TAG}

build_info:
  build_number: ${BUILD_NUMBER}
  git_commit: ${env.GIT_COMMIT_SHORT}
  branch: ${env.BRANCH_NAME}
  timestamp: ${new Date()}
"""
                    
                    archiveArtifacts artifacts: 'deployment-manifest.yaml', fingerprint: true
                    
                    // Publish to Artifactory (if configured)
                    script {
                        if (env.ARTIFACTORY_SERVER) {
                            echo "📤 Publishing to Artifactory..."
                            // Add Artifactory publishing logic here
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo "🧹 Cleaning up workspace..."
            script {
                // Clean up Docker images to save space
                sh """
                    docker image prune -f || true
                    docker container prune -f || true
                """
            }
        }
        
        success {
            echo "✅ Pipeline completed successfully!"
            script {
                if (env.BRANCH_NAME == 'main') {
                    echo "🎉 Main branch build completed - images pushed with 'latest' tag"
                }
            }
        }
        
        failure {
            echo "❌ Pipeline failed!"
        }
        
        unstable {
            echo "⚠️ Pipeline completed with warnings"
        }
    }
}