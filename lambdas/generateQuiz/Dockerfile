FROM public.ecr.aws/lambda/python:3.11

COPY app/requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ${LAMBDA_TASK_ROOT}/

CMD ["lambda_handler.lambda_handler"]