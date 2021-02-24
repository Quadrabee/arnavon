#!/usr/bin/env sh

command=$1

## prints arguments received and exit 0
if [ "$command" = "printargs" ]; then
  echo $@
  exit
fi

## prints arguments received and exit 0
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

## segfaults
if [ "$command" = "segfault" ]; then
  a() { a; }; a
fi

## sleep 1 second and exits 0
if [ "$command" = "sleep" ]; then
  sleep 1
  exit
fi

## default: prints "Hello World!" and exits 0
echo "Hello World!"
