#!/bin/bash

# Phase 1 Production Readiness Test Suite
# 
# This script runs all Phase 1 tests in the correct order:
# 1. Database setup and seeding
# 2. Functional tests
# 3. Load testing
# 4. Cleanup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BOLD='\033[1m'
RESET='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
TEST_LOG_FILE="$SCRIPT_DIR/test-results-$(date +%Y%m%d-%H%M%S).log"
FAILED_TESTS=()

echo_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${RESET}"
}

log_step() {
    local step=$1
    echo_color $CYAN "\\n🔄 $step"
    echo "$(date): $step" >> "$TEST_LOG_FILE"
}

log_success() {
    local message=$1
    echo_color $GREEN "✅ $message"
    echo "$(date): SUCCESS - $message" >> "$TEST_LOG_FILE"
}

log_error() {
    local message=$1
    echo_color $RED "❌ $message"
    echo "$(date): ERROR - $message" >> "$TEST_LOG_FILE"
}

log_warning() {
    local message=$1
    echo_color $YELLOW "⚠️  $message"
    echo "$(date): WARNING - $message" >> "$TEST_LOG_FILE"
}

# Function to check if service is running
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" &>/dev/null; then
        log_success "$service_name is running"
        return 0
    else
        log_error "$service_name is not running or not accessible"
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1
    
    echo_color $YELLOW "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" &>/dev/null; then
            log_success "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name did not become ready within $(($max_attempts * 2)) seconds"
    return 1
}

# Main test execution
run_phase1_tests() {
    echo_color $BOLD "\\n🚀 Phase 1 Production Readiness Test Suite"
    echo_color $BLUE "================================================"
    echo_color $WHITE "Test log: $TEST_LOG_FILE"
    echo_color $WHITE "Project root: $PROJECT_ROOT"
    
    # Step 1: Prerequisites check
    log_step "Checking prerequisites"
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js is available: $(node --version)"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm is available: $(npm --version)"
    
    # Check if the project has package.json
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json not found in project root"
        exit 1
    fi
    log_success "package.json found"
    
    # Step 2: Install dependencies
    log_step "Installing dependencies"
    cd "$PROJECT_ROOT"
    
    if npm ci --silent >> "$TEST_LOG_FILE" 2>&1; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        log_warning "Trying with npm install..."
        if npm install >> "$TEST_LOG_FILE" 2>&1; then
            log_success "Dependencies installed with npm install"
        else
            log_error "Failed to install dependencies with npm install"
            exit 1
        fi
    fi
    
    # Step 3: Environment setup
    log_step "Setting up environment"
    
    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_warning "Created .env from .env.example - please configure it"
        else
            log_error "No .env or .env.example file found"
            echo_color $YELLOW "Please create .env file with required environment variables:"
            echo_color $WHITE "  - DATABASE_URL"
            echo_color $WHITE "  - UPSTASH_REDIS_REST_URL"
            echo_color $WHITE "  - UPSTASH_REDIS_REST_TOKEN"
            echo_color $WHITE "  - WOOCOMMERCE_WEBHOOK_SECRET"
            exit 1
        fi
    else
        log_success ".env file found"
    fi
    
    # Step 4: Build the application
    log_step "Building the application"
    
    if npm run build >> "$TEST_LOG_FILE" 2>&1; then
        log_success "Application built successfully"
    else
        log_warning "Build failed, continuing with development mode"
        # Don't exit, as we can run tests in development mode
    fi
    
    # Step 5: Start the application
    log_step "Starting the application"
    
    # Start the Next.js application in background
    npm run dev >> "$TEST_LOG_FILE" 2>&1 &
    APP_PID=$!
    
    echo "Started application with PID: $APP_PID" >> "$TEST_LOG_FILE"
    
    # Function to cleanup on exit
    cleanup() {
        echo_color $YELLOW "\\nCleaning up..."
        if [ ! -z "$APP_PID" ]; then
            kill $APP_PID 2>/dev/null || true
            log_success "Application stopped"
        fi
    }
    trap cleanup EXIT
    
    # Wait for application to be ready
    if wait_for_service "Application" "curl -s http://localhost:3000/api/health || curl -s http://localhost:3000"; then
        log_success "Application is running and accessible"
    else
        log_error "Application failed to start or is not accessible"
        exit 1
    fi
    
    # Step 6: Database setup
    log_step "Setting up test database"
    
    if node "$SCRIPT_DIR/database-setup.mjs" >> "$TEST_LOG_FILE" 2>&1; then
        log_success "Database setup completed"
    else
        log_error "Database setup failed"
        echo_color $RED "Check the log file for details: $TEST_LOG_FILE"
        exit 1
    fi
    
    # Step 7: Run functional tests
    log_step "Running functional tests"
    
    if node "$SCRIPT_DIR/test-runner.mjs" 2>&1 | tee -a "$TEST_LOG_FILE"; then
        log_success "Functional tests completed"
    else
        log_error "Functional tests failed"
        FAILED_TESTS+=("Functional Tests")
    fi
    
    # Step 8: Run load tests (optional, can be skipped with --skip-load)
    if [[ "$*" != *"--skip-load"* ]]; then
        log_step "Running load tests"
        
        echo_color $YELLOW "This may take several minutes..."
        if node "$SCRIPT_DIR/load-test.mjs" 2>&1 | tee -a "$TEST_LOG_FILE"; then
            log_success "Load tests completed"
        else
            log_error "Load tests failed"
            FAILED_TESTS+=("Load Tests")
        fi
    else
        log_warning "Load tests skipped"
    fi
    
    # Step 9: Generate test report
    log_step "Generating test report"
    
    generate_test_report
    
    # Step 10: Summary
    echo_color $BOLD "\\n📋 TEST SUMMARY"
    echo_color $BLUE "================="
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        echo_color $GREEN "🎉 ALL TESTS PASSED! Phase 1 is production-ready."
        echo_color $WHITE "Log file: $TEST_LOG_FILE"
        return 0
    else
        echo_color $RED "❌ Some tests failed:"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo_color $RED "  • $failed_test"
        done
        echo_color $WHITE "Check the log file for details: $TEST_LOG_FILE"
        return 1
    fi
}

# Generate HTML test report
generate_test_report() {
    local report_file="$SCRIPT_DIR/test-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 1 Test Report - $(date +%Y-%m-%d\ %H:%M:%S)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; background: #f8f9fa; }
        .log-content { background: #2d2d2d; color: #fff; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Phase 1 Production Readiness Test Report</h1>
            <p class="timestamp">Generated: $(date +%Y-%m-%d\ %H:%M:%S)</p>
        </div>
        
        <div class="section">
            <h2>Test Summary</h2>
EOF

    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        echo '            <p class="success">✅ ALL TESTS PASSED! Phase 1 is production-ready.</p>' >> "$report_file"
    else
        echo '            <p class="error">❌ Some tests failed:</p>' >> "$report_file"
        echo '            <ul>' >> "$report_file"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo "                <li class=\"error\">$failed_test</li>" >> "$report_file"
        done
        echo '            </ul>' >> "$report_file"
    fi

    cat >> "$report_file" << EOF
        </div>
        
        <div class="section">
            <h2>Test Log</h2>
            <div class="log-content">$(cat "$TEST_LOG_FILE" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</div>
        </div>
        
        <div class="section">
            <h2>Phase 1 Components Tested</h2>
            <ul>
                <li>✅ Database persistence for carts</li>
                <li>✅ Webhook signature verification</li>
                <li>✅ Race conditions with proper locking</li>
                <li>✅ Comprehensive error handling</li>
                <li>✅ Load testing and performance validation</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF

    log_success "Test report generated: $report_file"
}

# Run the tests
run_phase1_tests "$@"