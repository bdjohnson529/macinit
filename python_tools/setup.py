from setuptools import setup

setup(
    name="hello-test",
    version="0.1",
    py_modules=["hello","heic_to_png"],
    entry_points={
        'console_scripts': [
            'say-hello = hello:main',
            'heic-to-png = heic_to_png:main'
        ],
    },
)
