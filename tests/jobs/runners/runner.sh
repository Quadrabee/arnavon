#!/usr/bin/env bash

command=$1

## prints arguments received and exit 0
if [ "$command" = "printargs" ]; then
  echo $@
  exit
fi

## prints json and exit 0
if [ "$command" = "json" ]; then
  echo '{ "foo": "bar", "sub": { "baz": 42 } }'
  exit
fi

## reads stdin and prints it on stdout
if [ "$command" = "echo" ]; then
  while read line
  do
    echo "$line"
  done
  exit
fi

## fails with exit code > 1
if [ "$command" = "fail" ]; then
  exit 10
fi

## prints json and exit code > 1
if [ "$command" = "failjson" ]; then
  echo '{ "foo": "bar", "sub": { "baz": 42 } }'
  exit 10
fi

## segfaults
if [ "$command" = "segfault" ]; then
  kill -11 $$
fi

## sleep 0.2 second and exits 0
if [ "$command" = "sleep" ]; then
  sleep 0.1
  exit
fi

## default: prints "Hello World!" and exits 0
echo "Hello World!"
