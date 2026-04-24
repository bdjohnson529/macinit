from setuptools import setup

setup(
    name="hello-test",
    version="0.1",
    py_modules=["hello"],
    entry_points={
        'console_scripts': [
            'say-hello = hello:main',
        ],
    },
)
