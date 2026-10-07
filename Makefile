PYTHON ?= python
.DEFAULT_GOAL := help
TASKS := setup venv env setup-backend setup-frontend dev dev-backend dev-frontend test test-backend test-frontend lint lint-backend lint-frontend coverage coverage-backend coverage-frontend build format format-backend format-frontend lock lock-backend lock-frontend docker-up docker-check down smoke hooks pre-commit migrate-backend export-api
.PHONY: help $(TASKS)
help:
	@echo EngMate-AI: setup dev test lint coverage build smoke
$(TASKS):
	$(PYTHON) scripts/manage.py $@
