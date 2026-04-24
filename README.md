# Mac init scripts
Scripts for initializing new macs with personal preferences, shortcuts and more.

## Bash Shortcuts
```
mv .zshrc ~/
source ~/.zshrc

## Library Installation
chmod +x install.sh
./install.sh
```

## Custom Python Libraries
Make sure Python is added to PATH, for example add this line to zshrc
```
export PATH="$PATH:/Users/YOUR_NAME_HERE/Library/Python/3.9/bin"
```

To install custom libraries
```
cd python_tools
pip3 install .
```

